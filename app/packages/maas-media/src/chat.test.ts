import { describe, expect, it } from "vitest";

import { complete, completeWithTools, parseTurn, stripFences } from "./chat.js";
import { createClient } from "./client.js";
import { type MediaConfig, defaultModels } from "./config.js";
import { PlatformError } from "./error.js";

/** 本该失败的调用竟然成功了。放在 `.then(unexpected, …)` 里，让失败分支的类型收窄成 PlatformError。 */
const unexpected = (): never => {
  throw new Error("本该失败");
};

describe("chat", () => {
  it("strips a fence that follows a preamble", () => {
    const raw = "这是歌词：\n```\n[Verse]\n夏天的风\n```\n希望你喜欢";
    expect(stripFences(raw)).toBe("[Verse]\n夏天的风");
  });

  it("strips the language tag line", () => {
    const raw = "```lyrics\n[Verse]\n夏天的风\n```";
    expect(stripFences(raw)).toBe("[Verse]\n夏天的风");
  });

  it("leaves unfenced text alone", () => {
    expect(stripFences("  夏天的风轻轻吹过  ")).toBe("夏天的风轻轻吹过");
  });

  it("does not treat an inline backtick as a fence", () => {
    const raw = "[Verse]\n她说 `再见`";
    expect(stripFences(raw)).toBe(raw);
  });
});

describe("chat tools", () => {
  it("a turn can be tool calls only", () => {
    // content 为空 + tool_calls 非空是最正常的一轮。当成错误的话
    // agent 第一步就走不下去。
    const v: unknown = JSON.parse(`{"choices":[{"finish_reason":"tool_calls","message":{"content":null,
                "tool_calls":[{"id":"c1","type":"function",
                "function":{"name":"canvas_list_nodes","arguments":"{}"}}]}}]}`);
    const t = parseTurn(v);
    expect(t.content).toBe("");
    expect(t.toolCalls.length).toBe(1);
    expect(t.toolCalls[0]!.id).toBe("c1");
    expect(t.toolCalls[0]!.name).toBe("canvas_list_nodes");
  });

  it("null arguments are treated as an empty object", () => {
    // 有的实现没参数时给 null。丢掉这次调用的话，agent 会以为工具
    // 没被调过而重试，陷在同一步上。
    const v: unknown = JSON.parse(`{"choices":[{"message":{"tool_calls":[{"id":"c1",
                "function":{"name":"list_capabilities","arguments":null}}]}}]}`);
    const t = parseTurn(v);
    expect(t.toolCalls[0]!.arguments).toBe("{}");
  });

  it("a plain text turn has no tool calls", () => {
    const v: unknown = JSON.parse(`{"choices":[{"finish_reason":"stop","message":{"content":"  做好了  "}}]}`);
    const t = parseTurn(v);
    expect(t.content).toBe("做好了");
    expect(t.toolCalls).toEqual([]);
    expect(t.finishReason).toBe("stop");
  });

  it("a malformed tool call does not drop the good ones", () => {
    // 一个坏的把整批丢掉的话，模型明明调了三个工具，我们只当它什么
    // 都没调 —— 它会原样再调一遍。
    const v: unknown = JSON.parse(`{"choices":[{"message":{"tool_calls":[
                {"id":"c1","function":{"arguments":"{}"}},
                {"id":"c2","function":{"name":"read","arguments":"{}"}}]}}]}`);
    const t = parseTurn(v);
    expect(t.toolCalls.length).toBe(1);
    expect(t.toolCalls[0]!.name).toBe("read");
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增
// ---------------------------------------------------------------------------

describe("chat（TS 移植新增）", () => {
  const cfg: MediaConfig = {
    platform: { base_url: "https://maas.example.com/v1", api_key: "k", chat_model: "qwen" },
    models: defaultModels(),
  };

  it("空内容 + finish_reason=length 时点明是预算不够", async () => {
    const client = createClient({
      fetch: async () => Response.json({ choices: [{ finish_reason: "length", message: { content: null } }] }),
    });
    const err = await complete(client, cfg, "s", "u", 0.7, 10, 1000).then(unexpected, (e: unknown) => e as PlatformError);
    expect(err.code).toBe("dpp.protocol");
    expect(err.message).toContain("max_tokens 截断");
  });

  it("工具为空时不发 tools / tool_choice；模型覆盖只在非空时生效", async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = createClient({
      fetch: async (_i, init) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return Response.json({ choices: [{ message: { content: "ok" } }] });
      },
    });
    await completeWithTools(client, cfg, [{ role: "user", content: "hi" }], [], 100, 1000, "  ");
    await completeWithTools(client, cfg, [], [{ type: "function" }], 100, 1000, "other");
    expect(bodies[0]!.model).toBe("qwen");
    expect("tools" in bodies[0]!).toBe(false);
    expect("tool_choice" in bodies[0]!).toBe(false);
    expect(bodies[1]!.model).toBe("other");
    expect(bodies[1]!.tool_choice).toBe("auto");
  });
});
