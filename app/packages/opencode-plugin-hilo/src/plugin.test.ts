import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import plugin from "./index.js";

/** 假 gateway：记下收到的请求，按预设回确认 / 防打转的决定。 */
let server: Server;
const calls: { path: string; body: any }[] = [];
let confirmReply: unknown = { decision: "confirm" };
let loopReply: unknown = { decision: "reject" };

beforeAll(async () => {
  server = createServer((req, res) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      const body = s ? JSON.parse(s) : undefined;
      calls.push({ path: req.url!, body });
      res.setHeader("content-type", "application/json");
      if (req.url!.includes("/tool-confirm/ask")) return res.end(JSON.stringify(confirmReply));
      if (req.url!.includes("/loop-guard/ask")) return res.end(JSON.stringify(loopReply));
      if (req.url!.endsWith("/root")) return res.end(JSON.stringify({ rootSessionId: "ses_root" }));
      res.statusCode = 404;
      res.end("{}");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  process.env.GATEWAY_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => {
  server.close();
  delete process.env.GATEWAY_URL;
});
beforeEach(() => {
  calls.length = 0;
  confirmReply = { decision: "confirm" };
  loopReply = { decision: "reject" };
  delete process.env.LOOP_GUARD_MODE;
});

async function load(dir = mkdtempSync(path.join(tmpdir(), "ov-plugin-"))) {
  return plugin({ directory: dir } as any);
}
const before = (h: any, tool: string, args: any, sessionID = "ses_a", callID = "call_1") => {
  const out = { args };
  return h["tool.execute.before"]({ tool, sessionID, callID }, out).then(() => out.args);
};

describe("opencode 插件", () => {
  it("没有 GATEWAY_URL 就不启动", async () => {
    const saved = process.env.GATEWAY_URL;
    delete process.env.GATEWAY_URL;
    await expect(load()).rejects.toThrow(/GATEWAY_URL/);
    process.env.GATEWAY_URL = saved;
  });

  it("工作语言：记下用户消息里的语言，拼到 system 最后一条的末尾；子会话按根会话取", async () => {
    const h: any = await load();
    await h["chat.message"]({ sessionID: "ses_root" }, { parts: [{ type: "text", metadata: { hilo_working_language: { locale: "zh-CN", source: "ui-preference" } } }] });
    const out = { system: ["你是助手"] };
    await h["experimental.chat.system.transform"]({ sessionID: "ses_root" }, out);
    expect(out.system).toHaveLength(1);
    expect(out.system[0]).toMatch(/^你是助手\n\n<working-language>\nworking_language: zh-CN\nsource: ui-preference/);
    const child = { system: ["子 agent"] };
    await h["experimental.chat.system.transform"]({ sessionID: "ses_child" }, child);
    expect(child.system[0]).toContain("working_language: zh-CN");
  });

  it("hub 工具注入会话参数；plan 工具强制项目根，memory 只在缺省时补", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-plugin-"));
    const h: any = await load(dir);
    expect(await before(h, "hub_generate_image", { prompt: "猫" })).toMatchObject({ _session_id: "ses_a", _tool_use_id: "call_1" });
    expect((await before(h, "hub_plan_write", { projectRoot: "/elsewhere" })).projectRoot).toBe(dir);
    expect((await before(h, "hub_memory", { projectRoot: "/mine" })).projectRoot).toBe("/mine");
    // 非 hub 工具不碰。
    expect(await before(h, "read", { file_path: "a" })).toEqual({ file_path: "a" });
  });

  it("工具确认：拒绝就抛错；改了参数就合并并记一笔", async () => {
    const h: any = await load();
    confirmReply = { decision: "reject", reject_reason: "user_rejected" };
    await expect(before(h, "hub_generate_image", { prompt: "猫" })).rejects.toThrow(/tool-confirm-reject:user_rejected/);
    confirmReply = { decision: "confirm", modified_args: { prompt: "狗" } };
    const args = await before(h, "hub_generate_image", { prompt: "猫" }, "ses_b");
    expect(args.prompt).toBe("狗");
    expect(args._user_override_note).toContain('prompt: "猫" -> "狗"');
  });

  it("gateway 连不上时：花钱的工具拒绝，其余放行", async () => {
    const saved = process.env.GATEWAY_URL;
    const h: any = await load();
    process.env.GATEWAY_URL = "http://127.0.0.1:1";
    await expect(before(h, "hub_generate_video", { prompt: "x" })).rejects.toThrow(/confirmation_unavailable/);
    await expect(before(h, "hub_canvas_list_nodes", {})).resolves.toBeTruthy();
    process.env.GATEWAY_URL = saved;
  });

  it("防打转：同样的调用第 3 次问 gateway，拒绝就拦下；新的一轮用户消息清零", async () => {
    const h: any = await load();
    const run = async () => {
      const args = await before(h, "hub_generate_image", { prompt: "一只猫", model_id: "m" }, "ses_loop");
      await h["tool.execute.after"]({ tool: "hub_generate_image", sessionID: "ses_loop", callID: "c", args }, {});
    };
    await run();
    await run();
    await expect(run()).rejects.toThrow(/LoopGuard blocked: tool hub_generate_image .* 3 times/);
    expect(calls.some((c) => c.path.includes("/loop-guard/ask"))).toBe(true);
    await h["chat.message"]({ sessionID: "ses_loop" }, { parts: [] });
    await expect(run()).resolves.toBeUndefined();
  });

  it("防打转 block 模式不问 gateway；换了说法（prompt 前 32 字不同）不算重复", async () => {
    process.env.LOOP_GUARD_MODE = "block";
    const h: any = await load();
    const call = async (prompt: string) => {
      const args = await before(h, "hub_generate_image", { prompt }, "ses_blk");
      await h["tool.execute.after"]({ tool: "hub_generate_image", sessionID: "ses_blk", callID: "c", args }, {});
    };
    await call("一只橘猫坐在窗台上");
    await call("一只橘猫坐在窗台上");
    await call("完全不同的画面：夜晚的城市街道");
    await expect(call("一只橘猫坐在窗台上")).rejects.toThrow(/LoopGuard blocked/);
    expect(calls.some((c) => c.path.includes("/loop-guard/ask"))).toBe(false);
  });

  it("question：推荐项挪到前面、描述补格式提醒；task 的斜杠命令被拦", async () => {
    const h: any = await load();
    const args = await before(h, "question", { questions: [{ options: [{ label: "A" }, { label: "B（推荐）" }, { label: "C (recommended)" }] }] });
    expect(args.questions[0].options.map((o: any) => o.label)).toEqual(["B（推荐）", "C (recommended)", "A"]);
    const def = { description: "Ask the user", parameters: {} };
    await h["tool.definition"]({ toolID: "question" }, def);
    expect(def.description).toContain("real JSON array");
    await expect(before(h, "task", { prompt: "/deploy now", subagent_type: "general" })).rejects.toThrow(/not a recognized slash command/);
  });

  it("记忆上下文：列出项目记忆，缺字段的不列", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-plugin-"));
    mkdirSync(path.join(dir, ".hilo/memory"), { recursive: true });
    writeFileSync(path.join(dir, ".hilo/memory/style.md"), "---\nname: 暖色调\ndescription: 用户偏好暖色调画面\ntype: media-style\n---\n正文");
    writeFileSync(path.join(dir, ".hilo/memory/bad.md"), "---\nname: 缺描述\ntype: user\n---\n");
    process.env.HUB_MEMORY_DIR = path.join(dir, "no-user-memory");
    const h: any = await load(dir);
    const out = { system: ["sys"] };
    await h["experimental.chat.system.transform"]({}, out);
    expect(out.system[0]).toContain("- 暖色调 [media-style] — 用户偏好暖色调画面");
    expect(out.system[0]).not.toContain("缺描述");
    delete process.env.HUB_MEMORY_DIR;
  });

  it("压缩后的合成续写消息补语言提示", async () => {
    const h: any = await load();
    await h["chat.message"]({ sessionID: "ses_c" }, { parts: [{ metadata: { hilo_working_language: { locale: "zh-CN", source: "session" } } }] });
    const out = { messages: [{ info: {}, parts: [{ type: "text", synthetic: true, sessionID: "ses_c", text: "Continue if you have next steps" }] }] };
    await h["experimental.chat.messages.transform"]({}, out);
    expect(out.messages[0]!.parts[0]!.text).toContain("[language] 请用中文回复。");
  });
});
