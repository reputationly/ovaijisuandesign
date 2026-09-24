import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createClient, send } from "./client.js";
import { PlatformError } from "./error.js";

// 一个接受连接但永远不回的本地服务 —— Rust 那边连的是 10.255.255.1 这种黑洞
// 地址，那依赖本机网络环境；本地起一个不回话的服务一样能造出真的超时，而且
// 完全不出网。
let server: Server;
let base = "";

beforeAll(async () => {
  server = createServer(() => {
    /* 故意不回 */
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});

/** 造一个真的超时错误 —— 连一个不会响应的地址，超时设 1ms。 */
async function timeoutError(): Promise<PlatformError> {
  try {
    await send(createClient(), {
      method: "GET",
      url: `${base}/never-answers`,
      apiKey: "k",
      timeoutMs: 1,
    });
  } catch (e) {
    if (e instanceof PlatformError) return e;
    throw e;
  }
  throw new Error("这个请求不该成功");
}

describe("error", () => {
  // **类别必须说得出来。**
  //
  // 原先是 `transport(e.to_string())`，只剩一句
  // `error sending request for url (…)` —— 超时和连接断长得一模一样，
  // 而两者的修法相反（放宽预算 vs 重试）。实测栽过：画布超分报这句，
  // 平台那边任务其实创建成功并跑完了，靠这句话分不出发生了什么。
  it("a timeout says it timed out", async () => {
    const err = await timeoutError();
    expect(err.code).toBe("dpp.transport");
    expect(err.message.includes("超时"), `消息里没有类别，等于没修: ${err.message}`).toBe(true);
    // 原始描述要保留 —— 里面有 URL，是定位用的。
    expect(err.message.includes(base), err.message).toBe(true);
  });

  // 不认识的失败也要给个类别，别留空 —— 留空就退回了原来那种
  // "看不出所以然"的状态。
  it("an unclassified failure still gets a label", async () => {
    const err = await timeoutError();
    const kind = err.message.split(":")[0];
    expect(kind !== undefined && kind.trim() !== "", `类别是空的: ${err.message}`).toBe(true);
  });

  it("parses the 4xx envelope", () => {
    const err = PlatformError.fromBody(
      400,
      `{"code":"invalid_request","message":"prompt is required","data":null}`,
    );
    expect(err.code).toBe("platform.invalid_request");
    expect(err.message).toBe("prompt is required");
  });

  it("parses the 5xx envelope", () => {
    const err = PlatformError.fromBody(
      503,
      `{"error":{"code":"model_not_found","message":"无可用渠道","type":"new_api_error"}}`,
    );
    expect(err.code).toBe("platform.model_not_found");
    expect(err.message).toBe("无可用渠道");
  });

  it("falls back when the body is not json", () => {
    const err = PlatformError.fromBody(502, "<html>bad gateway</html>");
    expect(err.code).toBe("platform.http_502");
    expect(err.message).toContain("502");
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增：Rust 那边 reqwest 的判定是现成的，这里是自己按 undici 的
// 错误形状做的映射，得单独守住。
// ---------------------------------------------------------------------------

describe("error（TS 移植新增）", () => {
  it("连接被拒说成「连接失败」，不是「超时」", async () => {
    // 先占一个端口再关掉，保证这个端口此刻没人听。
    const s = createServer();
    await new Promise<void>((r) => s.listen(0, "127.0.0.1", () => r()));
    const port = (s.address() as AddressInfo).port;
    await new Promise<void>((r) => s.close(() => r()));

    const url = `http://127.0.0.1:${port}/v1/videos`;
    const err = await send(createClient(), { method: "POST", url, apiKey: "k", timeoutMs: 5_000 }).then(
      () => {
        throw new Error("这个请求不该成功");
      },
      (e: unknown) => e as PlatformError,
    );
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.message.startsWith("连接失败"), err.message).toBe(true);
    expect(err.message).not.toContain("超时");
    expect(err.message).toContain("ECONNREFUSED");
    expect(err.message).toContain(url);
  });

  it("对端中途掐断说成「连接中断」", () => {
    // undici 的真实形状：TypeError: terminated ← SocketError: other side closed。
    const socketErr = Object.assign(new Error("other side closed"), {
      name: "SocketError",
      code: "UND_ERR_SOCKET",
    });
    const err = PlatformError.fromFetch(new TypeError("terminated", { cause: socketErr }), "https://x/v1/videos");
    expect(err.message.startsWith("连接中断"), err.message).toBe(true);
    expect(err.message).toContain("other side closed");
  });

  it("读响应体阶段的失败带上「请求/响应体中断」，超时同时保留", () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    const err = PlatformError.fromFetch(timeout, "https://x/v1/videos", "body");
    expect(err.message.startsWith("超时+请求/响应体中断"), err.message).toBe(true);
    expect(err.message).toContain("error reading response body for url (https://x/v1/videos)");
  });

  it("AggregateError 里的真实原因会被展开", () => {
    const refused = (addr: string) =>
      Object.assign(new Error(`connect ECONNREFUSED ${addr}`), { code: "ECONNREFUSED" });
    const agg = new AggregateError([refused("::1:1"), refused("127.0.0.1:1")], "");
    const err = PlatformError.fromFetch(new TypeError("fetch failed", { cause: agg }), "http://localhost:1/");
    expect(err.message.startsWith("连接失败"), err.message).toBe(true);
    expect(err.message).toContain("127.0.0.1:1");
  });

  it("cause 链截断到 400 字符，重复的层级只留一次", () => {
    let e: Error = new Error("x".repeat(100));
    for (let i = 0; i < 10; i++) e = new Error(`layer ${i} ${"y".repeat(60)}`, { cause: e });
    const err = PlatformError.fromFetch(e, "https://x/");
    expect([...err.message].length).toBe(401); // 400 + 末尾的 …
    expect(err.message.endsWith("…")).toBe(true);

    const same = new Error("boom", { cause: new Error("boom", { cause: new Error("boom") }) });
    const msg = PlatformError.fromFetch(same, "https://x/").message;
    expect(msg.split("boom").length - 1).toBe(1);
  });

  it("toString 是 [code] message，message 本身不带 code", () => {
    const err = PlatformError.config("models.video 未配置，这个能力不可用");
    expect(err.message).toBe("models.video 未配置，这个能力不可用");
    expect(String(err)).toBe("[dpp.config] models.video 未配置，这个能力不可用");
  });

  it("非 JSON 错误体按字符截断到 200", () => {
    const err = PlatformError.fromBody(500, "错".repeat(300));
    expect(err.message).toBe(`平台返回 500: ${"错".repeat(200)}…`);
  });
});
