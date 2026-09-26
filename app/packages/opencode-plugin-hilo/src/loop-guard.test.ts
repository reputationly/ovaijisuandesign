import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { type FakeGateway, startFakeGateway, status } from "./__fixtures__/fake-gateway.js";
import { askUserViaGateway, normalizeLoopGuardDecisionTimeoutMs } from "./loop-guard/ask-client.js";
import { CallHistory } from "./loop-guard/call-history.js";
import { fingerprint } from "./loop-guard/fingerprint.js";
import { createLoopGuard, LoopGuardError } from "./loop-guard/index.js";
import { SessionAllowList } from "./loop-guard/session-allow-list.js";

describe("防打转：指纹", () => {
  it("视频生成：时长落在同一个 3 秒桶、提示词只看规范化后的前 32 字", () => {
    const a = fingerprint("hub_generate_video", { model_name: "m", duration: 5, prompt: "A cat, running!" });
    const b = fingerprint("hub_generate_video", { model_name: "m", duration: 6, prompt: "a cat running" });
    const c = fingerprint("hub_generate_video", { model_name: "m", duration: 9, prompt: "a cat running" });
    expect(a).toMatch(/^vgen\|[0-9a-f]{16}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("参考图集合顺序无关；hub_ 前缀不影响分类", () => {
    const a = fingerprint("hub_generate_video", { reference_image_paths: ["x", "y"], prompt: "p" });
    const b = fingerprint("generate_video", { reference_image_paths: ["y", "x"], prompt: "p" });
    expect(a).toBe(b);
  });

  it("音频：texts 数组排序后比较；不同音色不同指纹", () => {
    const a = fingerprint("hub_generate_audio_speech", { voice_id: "v1", texts: ["你好", "再见"] });
    expect(fingerprint("hub_generate_audio_speech", { voice_id: "v1", texts: ["再见", "你好"] })).toBe(a);
    expect(fingerprint("hub_generate_audio_speech", { voice_id: "v2", texts: ["你好", "再见"] })).not.toBe(a);
    expect(a.startsWith("agen|")).toBe(true);
  });

  it("读文件只看路径，不看 offset；task 看子 agent 和描述", () => {
    expect(fingerprint("read", { filePath: "/a", offset: 1 })).toBe("read|/a");
    expect(fingerprint("read", { file_path: "/a", offset: 99 })).toBe("read|/a");
    expect(fingerprint("task", { subagent_type: "media-agent", description: "Make" })).toMatch(/^task\|media-agent\|/);
  });

  it("其余工具按完整参数；非对象参数也能算", () => {
    expect(fingerprint("hub_generate_image", { prompt: "a" })).not.toBe(fingerprint("hub_generate_image", { prompt: "b" }));
    expect(fingerprint("bash", null)).toMatch(/^default\|bash\|/);
  });
});

describe("防打转：历史和白名单", () => {
  it("每会话最多留 maxPerSession 条；满了按 LRU 淘汰会话；闲置过期的先清", () => {
    const h = new CallHistory({ maxPerSession: 2, maxSessions: 2, idleTTLms: 100 });
    h.push("a", { fp: "1", tool: "t", ts: 0 });
    h.push("a", { fp: "2", tool: "t", ts: 1 });
    h.push("a", { fp: "3", tool: "t", ts: 2 });
    expect(h.recent("a", 5).map((r) => r.fp)).toEqual(["2", "3"]);
    h.push("b", { fp: "1", tool: "t", ts: 3 });
    h.push("c", { fp: "1", tool: "t", ts: 4 });
    expect(h.recent("a", 5)).toEqual([]);
    h.push("d", { fp: "1", tool: "t", ts: 1000 });
    expect(h.size()).toBe(1);
  });

  it("白名单每会话限量，超了淘汰最久没用的指纹", () => {
    const l = new SessionAllowList({ maxSessions: 1, maxFingerprintsPerSession: 2 });
    l.add("s", "a");
    l.add("s", "b");
    expect(l.has("s", "a")).toBe(true);
    l.add("s", "c");
    expect(l.has("s", "b")).toBe(false);
    expect(l.has("s", "a")).toBe(true);
    l.add("t", "x");
    expect(l.size()).toBe(1);
    expect(l.has("s", "a")).toBe(false);
  });
});

describe("防打转：判定", () => {
  const call = { sessionID: "s", tool: "hub_generate_image", args: { prompt: "猫" } };

  it("窗口 5 次里已有 2 次，第 3 次问；拒绝就抛 LoopGuardError，带三条出路", async () => {
    const onAsk = vi.fn(async () => "reject" as const);
    const g = createLoopGuard({ onAsk });
    g.record(call);
    await expect(g.check(call)).resolves.toBeUndefined();
    g.record(call);
    const err = await g.check(call).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LoopGuardError);
    expect((err as LoopGuardError).code).toBe("LOOP_GUARD_BLOCK");
    expect((err as Error).message).toContain('tool "hub_generate_image" was called with semantically-identical arguments 3 times within the last 5 tool calls.');
    expect((err as Error).message).toContain("Choose ONE of:");
    expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ hits: 3, window: 5 }));
  });

  it("本会话都允许：之后同样的调用不再问", async () => {
    const onAsk = vi.fn(async () => "allow_session" as const);
    const g = createLoopGuard({ onAsk });
    g.record(call);
    g.record(call);
    await g.check(call);
    await g.check(call);
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(g._allowedSessionCount()).toBe(1);
  });

  it("并发的同一调用只问一次；允许一次只归第一个，其余拦下", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const onAsk = vi.fn(async () => {
      await gate;
      return "allow_once" as const;
    });
    const g = createLoopGuard({ onAsk });
    g.record(call);
    g.record(call);
    const first = g.check(call);
    const second = g.check(call).catch((e: Error) => e);
    release();
    await expect(first).resolves.toBeUndefined();
    expect(((await second) as Error).message).toContain("concurrent duplicate");
    expect(onAsk).toHaveBeenCalledTimes(1);
  });

  it("问的过程抛错按拒绝；新一轮用户消息清空窗口", async () => {
    const g = createLoopGuard({
      onAsk: async () => {
        throw new Error("boom");
      },
    });
    g.record(call);
    g.record(call);
    await expect(g.check(call)).rejects.toBeInstanceOf(LoopGuardError);
    g.resetSession("s");
    await expect(g.check(call)).resolves.toBeUndefined();
  });
});

describe("防打转：问用户", () => {
  let gw: FakeGateway;
  beforeAll(async () => {
    gw = await startFakeGateway();
  });
  afterAll(() => gw.close());
  beforeEach(() => gw.reset());

  const input = { sessionID: "ses/1", tool: "hub_generate_image", hits: 3, window: 5, recentTools: ["hub_generate_image"], fingerprint: "fp" };

  it("请求体带 request_id 和超时；按回复的决定走", async () => {
    gw.routes.set("/loop-guard/ask", { decision: "allow_session" });
    expect(await askUserViaGateway(gw.url, input, 1000)).toBe("allow_session");
    const ask = gw.calls[0]!;
    expect(ask.path).toBe("/api/internal/sessions/ses%2F1/loop-guard/ask");
    expect(ask.body).toMatchObject({ tool: "hub_generate_image", hits: 3, window: 5, recent_tools: ["hub_generate_image"], fingerprint: "fp", timeout_ms: 1000 });
    expect(ask.body.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("回复出错时先对账：用户已经点过就用那个决定，对不上才拒绝", async () => {
    gw.routes.set("/loop-guard/ask", status(502));
    // 对账路径以 request_id 结尾，用兜底路由按路径判断。
    gw.routes.set("",(c: { path: string }) => (c.path.includes("/settlements/") ? { status: "settled", decision: "allow_once" } : status(404)));
    expect(await askUserViaGateway(gw.url, input, 1000)).toBe("allow_once");
    gw.routes.set("", (c: { path: string }) => (c.path.includes("/settlements/") ? { status: "pending" } : status(404)));
    expect(await askUserViaGateway(gw.url, input, 1000)).toBe("reject");
    gw.routes.set("/loop-guard/ask", { decision: "maybe" });
    expect(await askUserViaGateway(gw.url, input, 1000)).toBe("reject");
  });

  it("超时时长归一：非法值用 30 秒，上限 60 秒", () => {
    expect(normalizeLoopGuardDecisionTimeoutMs(undefined)).toBe(30_000);
    expect(normalizeLoopGuardDecisionTimeoutMs(-1)).toBe(30_000);
    expect(normalizeLoopGuardDecisionTimeoutMs(999_999)).toBe(60_000);
    expect(normalizeLoopGuardDecisionTimeoutMs(1500.7)).toBe(1500);
  });
});
