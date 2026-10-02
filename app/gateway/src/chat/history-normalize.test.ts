import { describe, expect, it } from "vitest";

import { collectTaskChildSessionIds, convertOpenCodeMessages, parseAttachmentPrefix, type RawMessage } from "./history-normalize.js";

/**
 * 回归护栏：渲染器的 `backendMessagesToChat()` 只认扁平帧。gateway 一旦把 opencode
 * 原始 `{info, parts}` 直接塞进 `session_switched.messages`，渲染器逐条落 default，
 * 历史就被解析成 0 条 —— 表现是重启后聊天面板空白。这组测试锁住压平后的帧形状。
 */

const DIR = "/Users/me/Movies/蒜狸小助手/Projects/demo";

function userMsg(id: string, text: string, created = 1): RawMessage {
  return { info: { id, role: "user", sessionID: "ses_root", time: { created } }, parts: [{ type: "text", text }] };
}

function assistantMsg(id: string, parts: Record<string, any>[], created = 2): RawMessage {
  return { info: { id, role: "assistant", sessionID: "ses_root", time: { created } }, parts };
}

describe("convertOpenCodeMessages", () => {
  it("文字消息压成 text 帧，用户消息带 runtimeMessageId", () => {
    const out = convertOpenCodeMessages([userMsg("msg_u1", "帮我做个视频"), assistantMsg("msg_a1", [{ type: "text", text: "好的" }])], { directory: DIR });
    expect(out).toEqual([
      { type: "text", role: "user", content: "帮我做个视频", runtimeMessageId: "msg_u1" },
      { type: "text", role: "assistant", content: "好的", runtimeMessageId: "msg_a1" },
    ]);
  });

  it("工具调用压成 tool_call + tool_result（渲染器按 callID 配对）", () => {
    const out = convertOpenCodeMessages(
      [
        assistantMsg("msg_a1", [
          { type: "tool", tool: "hub_generate_image", id: "prt_1", callID: "call_1", state: { status: "completed", input: { prompt: "猫" }, output: "images/a.png" } },
        ]),
      ],
      { directory: DIR },
    );
    expect(out[0]).toMatchObject({
      type: "tool_call",
      tool: "hub_generate_image",
      partId: "prt_1",
      callID: "call_1",
      status: "completed",
      args: JSON.stringify({ prompt: "猫" }),
      runtimeMessageId: "msg_a1",
    });
    expect(out[1]).toEqual({ type: "tool_result", content: "images/a.png", runtimeMessageId: "msg_a1" });
  });

  it("工具原始 status 不被改写（渲染器自己 map completed→ok）", () => {
    const out = convertOpenCodeMessages([assistantMsg("m", [{ type: "tool", tool: "t", id: "p", callID: "c", state: { status: "running" } }])], { directory: DIR });
    expect(out[0].status).toBe("running");
  });

  it("reasoning 压成 thinking 帧", () => {
    const out = convertOpenCodeMessages([assistantMsg("m", [{ type: "reasoning", text: "先想一下" }])], { directory: DIR });
    expect(out).toEqual([{ type: "thinking", content: "先想一下", runtimeMessageId: "m" }]);
  });

  it("合成 / 压缩 part 与压缩消息整体丢弃", () => {
    const out = convertOpenCodeMessages(
      [
        userMsg("u", "hi"),
        { info: { id: "cmp", role: "assistant", summary: true, sessionID: "ses_root" }, parts: [{ type: "text", text: "摘要" }] },
        assistantMsg("a", [
          { type: "text", text: "合成内容", synthetic: true },
          { type: "text", text: "被忽略", ignored: true },
          { type: "compaction", text: "x" },
          { type: "step-start" },
          { type: "text", text: "保留" },
        ]),
      ],
      { directory: DIR },
    );
    expect(out.map((m) => m.content)).toEqual(["hi", "保留"]);
  });

  it("task 工具展开子会话：sub_agent_start/text/end 挂在 task 帧之后", () => {
    const raw: RawMessage[] = [
      assistantMsg("a1", [
        { type: "tool", tool: "task", id: "prt_task", callID: "call_task", state: { status: "completed", input: { subagent_type: "media-agent" }, output: "done", metadata: { sessionId: "ses_child" } } },
      ]),
    ];
    const child: RawMessage[] = [
      { info: { id: "c1", role: "assistant", sessionID: "ses_child", time: { created: 10 } }, parts: [{ type: "text", text: "子 agent 在干活" }] },
      { info: { id: "c2", role: "assistant", sessionID: "ses_child", time: { created: 11 } }, parts: [{ type: "tool", tool: "hub_generate_video", id: "prt_c2", callID: "call_c2", state: { status: "completed", input: {}, output: "videos/x.mp4" } }] },
    ];
    const childMessages = new Map([["ses_child", child]]);
    const out = convertOpenCodeMessages(raw, { directory: DIR, childMessages });

    expect(out.map((m) => m.type)).toEqual([
      "tool_call",
      "tool_result",
      "sub_agent_start",
      "sub_agent_text",
      "sub_agent_tool_call",
      "sub_agent_tool_result",
      "sub_agent_end",
    ]);
    expect(out[0]).toMatchObject({ type: "tool_call", tool: "task", childSessionId: "ses_child", taskPartId: "prt_task" });
    expect(out[3]).toMatchObject({ type: "sub_agent_text", agent: "media-agent", content: "子 agent 在干活", childSessionId: "ses_child" });
    expect(out[5]).toMatchObject({ type: "sub_agent_tool_result", agent: "media-agent", content: "videos/x.mp4" });
  });

  it("同一子会话被 task 调用两次时按时间窗切分（第二轮不重复展开第一轮）", () => {
    const raw: RawMessage[] = [
      assistantMsg(
        "a1",
        [{ type: "tool", tool: "task", id: "pt1", callID: "c1", state: { status: "completed", input: { subagent_type: "x" }, metadata: { sessionId: "ses_child" }, time: { start: 100 } } }],
        100,
      ),
      assistantMsg(
        "a2",
        [{ type: "tool", tool: "task", id: "pt2", callID: "c2", state: { status: "completed", input: { subagent_type: "x" }, metadata: { sessionId: "ses_child" }, time: { start: 200 } } }],
        200,
      ),
    ];
    const child: RawMessage[] = [
      { info: { id: "c1", role: "assistant", sessionID: "ses_child", time: { created: 50 } }, parts: [{ type: "text", text: "第一轮" }] },
      { info: { id: "c2", role: "assistant", sessionID: "ses_child", time: { created: 150 } }, parts: [{ type: "text", text: "第二轮" }] },
      { info: { id: "c3", role: "assistant", sessionID: "ses_child", time: { created: 250 } }, parts: [{ type: "text", text: "第三轮" }] },
    ];
    const out = convertOpenCodeMessages(raw, { directory: DIR, childMessages: new Map([["ses_child", child]]) });
    const subTexts = out.filter((m) => m.type === "sub_agent_text").map((m) => m.content);
    // 第一次 task 只展开 created ∈ [100,200) → 第二轮；第二次展开 [200,∞) → 第三轮。
    // 第一轮（created=50）早于第一次 task 的 start，不属于任何窗口，不展开。
    expect(subTexts).toEqual(["第二轮", "第三轮"]);
    expect(out.filter((m) => m.type === "sub_agent_text" && m.taskPartId === "pt1").map((m) => m.content)).toEqual(["第二轮"]);
    expect(out.filter((m) => m.type === "sub_agent_text" && m.taskPartId === "pt2").map((m) => m.content)).toEqual(["第三轮"]);
  });

  it("assistant 的错误消息压成 error 帧", () => {
    const out = convertOpenCodeMessages(
      [{ info: { id: "e1", role: "assistant", sessionID: "ses_root", error: { name: "ContentPolicyViolationError" } }, parts: [] }],
      { directory: DIR },
    );
    expect(out).toEqual([{ type: "error", error_code: "CONTENT_POLICY_VIOLATION", content: "", runtimeMessageId: "e1" }]);
  });

  it("空历史压成空数组（渲染器侧会走 no-history-to-install 分支）", () => {
    expect(convertOpenCodeMessages([], { directory: DIR })).toEqual([]);
  });

  it("注入前缀（CONTEXT/HISTORY）不显示给用户", () => {
    const out = convertOpenCodeMessages([userMsg("u", "[CONTEXT foo] 真正的内容")], { directory: DIR });
    expect(out[0].content).toBe("真正的内容");
  });
});

describe("parseAttachmentPrefix", () => {
  it("解析 gateway 自己写出的附件清单，转成 serve URL", () => {
    const text = `[User attached files:\n- [1] image: ${DIR}/images/a.png (canvas node n1)\n]\n看下这张图`;
    const parsed = parseAttachmentPrefix(text, DIR);
    expect(parsed?.content).toBe("看下这张图");
    expect(parsed?.attachments).toEqual([{ path: `${DIR}/images/a.png`, url: "/api/files/images/a.png", type: "image" }]);
  });

  it("不含附件清单时返回 null，文本按原样显示", () => {
    expect(parseAttachmentPrefix("普通消息", DIR)).toBeNull();
  });
});

describe("collectTaskChildSessionIds", () => {
  it("收集所有 task 指向的子会话，可递归", () => {
    const raw: RawMessage[] = [
      assistantMsg("a", [
        { type: "tool", tool: "task", state: { metadata: { sessionId: "ses_c1" } } },
        { type: "tool", tool: "task", state: { metadata: { sessionId: "ses_c2" } } },
        { type: "tool", tool: "other", state: {} },
      ]),
    ];
    expect([...collectTaskChildSessionIds(raw)].sort()).toEqual(["ses_c1", "ses_c2"]);
  });
});
