/**
 * 「下一步提示建议」的纯逻辑测试（第 27 轮）。
 *
 * 为什么先测这些：端点的完整 e2e 需要真实运行时会话（runtimeId 由渲染器建会话时才有），
 * 搭起来成本高；而决定「给不给建议、建议对不对」的其实全是纯函数 ——
 *   transcript 的取舍规则、提示词的解析、三种协议的响应判定。
 * 这些用假数据就能测死，端点本身只剩「取消息 + 调模型 + 包一层」。
 */

import { describe, expect, it } from "vitest";

import { NextPromptSuggestionController } from "./next-prompt-suggestion.controller.js";
import {
  SUGGESTION_MAX_OUTPUT_TOKENS,
  SUGGESTION_TASK,
  buildSuggestionRequestBody,
  parseSuggestionAnswer,
} from "./next-prompt-suggestion/suggestion-prompt.js";
import { parseSuggestionResponse } from "./next-prompt-suggestion/suggestion-protocols.js";
import { buildSuggestionTranscript } from "./next-prompt-suggestion/suggestion-transcript.js";
import { resolveSuggestionTarget } from "./next-prompt-suggestion/suggestion-target.js";

/** 造一条 OpenCode 形状的原始消息。 */
function raw(
  role: "user" | "assistant",
  text: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    info: {
      role,
      ...(role === "assistant"
        ? { time: { completed: 1 }, finish: "stop", providerID: "maas", modelID: "m" }
        : {}),
      ...extra,
    },
    parts: [{ type: "text", text }],
  };
}

const T = String.fromCharCode(60) + "think" + String.fromCharCode(62);
const TE = String.fromCharCode(60) + "/think" + String.fromCharCode(62);

describe("buildSuggestionTranscript", () => {
  it("最后一条不是已完成的助手回复 -> 不生成建议", () => {
    expect(buildSuggestionTranscript([raw("user", "做个海报")])).toBeNull();
    expect(
      buildSuggestionTranscript([
        raw("user", "做个海报"),
        raw("assistant", "好的", { time: undefined }),
      ]),
    ).toBeNull();
    expect(
      buildSuggestionTranscript([
        raw("user", "做个海报"),
        raw("assistant", "好的", { finish: "tool-calls" }),
      ]),
    ).toBeNull();
    expect(
      buildSuggestionTranscript([raw("user", "做个海报"), raw("assistant", "好的", { error: "boom" })]),
    ).toBeNull();
  });

  it("正常一轮 -> 只保留从第一条 user 开始的内容", () => {
    const out = buildSuggestionTranscript([
      raw("assistant", "开场白（前面没有 user，应被丢掉）"),
      raw("user", "做个海报"),
      raw("assistant", "好的，已生成"),
    ]);
    expect(out).toEqual([
      { role: "user", content: "做个海报" },
      { role: "assistant", content: "好的，已生成" },
    ]);
  });

  it("编辑类回合（带 document_editing_context）-> 放弃生成", () => {
    expect(
      buildSuggestionTranscript([
        raw("user", "<document_editing_context>改这段</document_editing_context>"),
        raw("assistant", "改好了"),
      ]),
    ).toBeNull();
  });

  it("汇总消息（compaction）不参与，且会被过滤掉", () => {
    const out = buildSuggestionTranscript([
      raw("user", "做个海报"),
      raw("assistant", "这是压缩摘要", { summary: true }),
      raw("assistant", "好的"),
    ]);
    expect(out?.map((m) => m.content)).toEqual(["做个海报", "好的"]);
  });

  it("助手消息里的  thinking 会被剥掉", () => {
    const out = buildSuggestionTranscript([
      raw("user", "做个海报"),
      raw("assistant", `${T}内部推理${TE}好的，已生成`),
    ]);
    expect(out?.[1]?.content).toBe("好的，已生成");
  });
});

describe("parseSuggestionAnswer", () => {
  it("压空白、剥 think", () => {
    expect(parseSuggestionAnswer("  把  标题\n\n改 简洁一点  ")).toBe("把 标题 改 简洁一点");
    const think = String.fromCharCode(60) + "think" + String.fromCharCode(62);
    const end = String.fromCharCode(60) + "/think" + String.fromCharCode(62);
    expect(parseSuggestionAnswer(`a${think}推理${end}b`)).toBe("ab");
  });

  it("只有工具记录、没有文字 -> null", () => {
    expect(parseSuggestionAnswer("[tool: image_search running]")).toBeNull();
  });

  it("空字符串 -> null", () => {
    expect(parseSuggestionAnswer("   ")).toBeNull();
  });
});

describe("parseSuggestionResponse（三种协议）", () => {
  it("messages：stop_reason 必须是 end_turn", () => {
    const ok = { stop_reason: "end_turn", content: [{ type: "text", text: "继续做视频版" }] };
    expect(parseSuggestionResponse("messages", ok)).toBe("继续做视频版");
    expect(parseSuggestionResponse("messages", { ...ok, stop_reason: "max_tokens" })).toBeNull();
  });

  it("responses：status 必须是 completed，取 output_text", () => {
    const ok = {
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "换成竖版" }] }],
    };
    expect(parseSuggestionResponse("responses", ok)).toBe("换成竖版");
    expect(parseSuggestionResponse("responses", { ...ok, status: "incomplete" })).toBeNull();
  });

  it("chat：finish_reason 必须是 stop", () => {
    const ok = { choices: [{ finish_reason: "stop", message: { content: "再加个字幕" } }] };
    expect(parseSuggestionResponse("chat", ok)).toBe("再加个字幕");
    expect(
      parseSuggestionResponse("chat", { choices: [{ finish_reason: "length", message: { content: "x" } }] }),
    ).toBeNull();
  });
});

describe("buildSuggestionRequestBody", () => {
  it("system 带 cache_control，最后一条历史带 cache_control，末尾追加任务", () => {
    const body = buildSuggestionRequestBody({
      model: "maas/m",
      transcript: [
        { role: "user", content: "做个海报" },
        { role: "assistant", content: "好的" },
      ],
    });
    expect(body.max_tokens).toBe(SUGGESTION_MAX_OUTPUT_TOKENS);
    expect(body.stream).toBe(false);
    expect(body.system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(body.messages).toHaveLength(3);
    expect(body.messages[1]?.content[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(body.messages[2]?.content[0]?.text).toBe(SUGGESTION_TASK);
  });
});

describe("resolveSuggestionTarget", () => {
  const config = (npm: string, options?: Record<string, unknown>, id = "maas") => ({
    provider: { [id]: { npm, models: { m: { id: "m-real" } }, options } },
  });

  it("平台 provider + messages 协议 -> cloud，且用 model.id", () => {
    const t = resolveSuggestionTarget(config("@ai-sdk/anthropic"), { providerID: "maas", modelID: "m" });
    expect(t).toMatchObject({ protocol: "messages", model: "m-real", source: "cloud" });
  });

  it("平台 provider + chat 协议 -> null（参照里这条路不走）", () => {
    expect(
      resolveSuggestionTarget(config("@ai-sdk/openai-compatible"), { providerID: "maas", modelID: "m" }),
    ).toBeNull();
  });

  it("用户自配 provider：缺 baseURL/apiKey -> null；齐全则拼出 endpoint 与认证头", () => {
    const ref = { providerID: "user-custom-x", modelID: "m" };
    expect(resolveSuggestionTarget(config("@ai-sdk/anthropic", {}, "user-custom-x"), ref)).toBeNull();
    const t = resolveSuggestionTarget(
      config("@ai-sdk/anthropic", { baseURL: "https://x.test/v1/", apiKey: "k", headers: { "X-A": "1" } }, "user-custom-x"),
      ref,
    );
    expect(t?.source).toBe("custom");
    expect(t?.endpoint?.url).toBe("https://x.test/v1/messages");
    expect(t?.endpoint?.headers).toMatchObject({
      "x-api-key": "k",
      "anthropic-version": "2023-06-01",
      "X-A": "1",
    });
  });
});

describe("controller", () => {
  it("会话 id 格式非法 -> BadRequestException", async () => {
    const controller = new NextPromptSuggestionController({
      suggest: async () => ({ suggestion: null, source: null }),
    } as never);
    await expect(controller.suggest("bad id!", {} as never)).rejects.toThrow(/Invalid session ID/);
  });

  it("合法 id -> 原样返回 service 结果", async () => {
    const controller = new NextPromptSuggestionController({
      suggest: async () => ({ suggestion: "继续做视频版", source: "platform" }),
    } as never);
    let sent: unknown;
    const res = { json: (v: unknown) => (sent = v) } as never;
    await controller.suggest("abc-123", res);
    expect(sent).toEqual({ suggestion: "继续做视频版", source: "platform" });
  });
});
