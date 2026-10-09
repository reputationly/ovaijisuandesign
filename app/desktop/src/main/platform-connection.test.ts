import { describe, expect, it } from "vitest";

import { PlatformConnection, checkPlatformKey } from "./platform-connection.js";

const BASE = "https://maas.example.com/v1/";

/** 假的 fetch：按 status 回包；传 Error 则模拟网络故障；记下每次调用。 */
function fakeFetch(respond: number | Error | ((auth: string) => number)) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (respond instanceof Error) throw respond;
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    const status = typeof respond === "function" ? respond(auth) : respond;
    return new Response("{}", { status });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("checkPlatformKey（令牌探测）", () => {
  it("没填令牌：直接判未连接，不发请求", async () => {
    const f = fakeFetch(200);
    const r = await checkPlatformKey({ base_url: BASE, api_key: "   " }, { fetchFn: f.fn });
    expect(r).toEqual({ ok: false, reason: "还没有填写令牌" });
    expect(f.calls).toHaveLength(0);
  });

  it("200 → 已连接；请求打到去掉尾斜杠的 /models，Bearer 用去掉首尾空白的令牌", async () => {
    const f = fakeFetch(200);
    const r = await checkPlatformKey({ base_url: BASE, api_key: " sk-test-1 " }, { fetchFn: f.fn });
    expect(r).toEqual({ ok: true });
    const [call] = f.calls;
    expect(call?.url).toBe("https://maas.example.com/v1/models");
    expect(new Headers(call?.init.headers).get("authorization")).toBe("Bearer sk-test-1");
    expect(call?.init.signal).toBeDefined();
  });

  it("401 / 403 → 令牌无效或已停用", async () => {
    const bad = { ok: false, reason: "令牌无效或已停用" };
    expect(await checkPlatformKey({ base_url: BASE, api_key: "sk-bad" }, { fetchFn: fakeFetch(401).fn })).toEqual(bad);
    expect(await checkPlatformKey({ base_url: BASE, api_key: "sk-bad" }, { fetchFn: fakeFetch(403).fn })).toEqual(bad);
  });

  it("其它 HTTP 错误：原因里带状态码", async () => {
    const r = await checkPlatformKey({ base_url: BASE, api_key: "sk-x" }, { fetchFn: fakeFetch(502).fn });
    expect(r).toEqual({ ok: false, reason: "平台返回 HTTP 502" });
  });

  it("网络故障：未连接，原因里有错误信息，不抛错", async () => {
    const r = await checkPlatformKey({ base_url: BASE, api_key: "sk-x" }, { fetchFn: fakeFetch(new TypeError("fetch failed")).fn });
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toContain("fetch failed");
  });
});

describe("PlatformConnection（启动探测 + 缓存状态）", () => {
  it("还没探测过：检测中", () => {
    const c = new PlatformConnection(() => ({ base_url: BASE, api_key: "sk-x" }), { fetchFn: fakeFetch(200).fn });
    expect(c.current()).toEqual({ state: "checking", checkedAt: null, reason: null });
  });

  it("探测通过 → 已连接，并记下探测时间", async () => {
    const c = new PlatformConnection(() => ({ base_url: BASE, api_key: "sk-x" }), { fetchFn: fakeFetch(200).fn });
    const s = await c.refresh();
    expect(s.state).toBe("connected");
    expect(s.reason).toBeNull();
    expect(typeof s.checkedAt).toBe("number");
    expect(c.current()).toEqual(s);
  });

  it("探测不过 → 未连接，原因可读", async () => {
    const c = new PlatformConnection(() => ({ base_url: BASE, api_key: "sk-x" }), { fetchFn: fakeFetch(401).fn });
    const s = await c.refresh();
    expect(s.state).toBe("disconnected");
    expect(s.reason).toBe("令牌无效或已停用");
  });

  it("换了令牌再刷新：先回到检测中，结果跟着新令牌走", async () => {
    let key = "sk-old";
    const f = fakeFetch((auth) => (auth === "Bearer sk-new" ? 200 : 401));
    const c = new PlatformConnection(() => ({ base_url: BASE, api_key: key }), { fetchFn: f.fn });
    expect((await c.refresh()).state).toBe("disconnected");

    key = "sk-new";
    const pending = c.refresh();
    expect(c.current().state).toBe("checking");
    expect((await pending).state).toBe("connected");
  });

  it("配置读不出来：未连接，不抛错", async () => {
    const c = new PlatformConnection(
      () => {
        throw new Error("config broken");
      },
      { fetchFn: fakeFetch(200).fn },
    );
    const s = await c.refresh();
    expect(s.state).toBe("disconnected");
    expect(s.reason).toContain("config broken");
  });

  it("探测还没完成时再次 refresh：复用同一次请求，不并发打平台", async () => {
    const f = fakeFetch(200);
    const c = new PlatformConnection(() => ({ base_url: BASE, api_key: "sk-x" }), { fetchFn: f.fn });
    const [a, b] = await Promise.all([c.refresh(), c.refresh()]);
    expect(f.calls).toHaveLength(1);
    expect(a).toEqual(b);
  });

  it("日志只记结论，不出现令牌", async () => {
    const lines: string[] = [];
    const c = new PlatformConnection(() => ({ base_url: BASE, api_key: "sk-secret-123" }), {
      fetchFn: fakeFetch(401).fn,
      log: (l) => lines.push(l),
    });
    await c.refresh();
    expect(lines).toHaveLength(1);
    expect(lines.join("\n")).not.toContain("sk-secret-123");
  });
});
