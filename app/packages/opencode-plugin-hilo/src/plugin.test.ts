import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type FakeGateway, startFakeGateway, status } from "./__fixtures__/fake-gateway.js";
import { _resetSkillMetaCacheForTests } from "./skill-meta-reader.js";
import plugin from "./index.js";

/** 假 gateway 的默认回复：和我们的 gateway 一致（没有计费体系，分组一律 legacy）。 */
const DEFAULTS = {
  "/tool-confirm/ask": { decision: "confirm" },
  "/loop-guard/ask": { decision: "reject" },
  "/root": { rootSessionId: "ses_root" },
  "/request-group": { group_id: null, mode: "legacy", source: "no_selection" },
  "/loop-guard-trip": { ok: true },
  "/mcp-tool-call": { ok: true },
  "/attachment-observations": { attachment_refs: [] },
  "/api/models": {
    imageModels: [{ id: "seedream-4.0", type: "image", display_name: "seedream-4.0", tool_names: ["hub_generate_image"], series_id: "seedream-4.0" }],
    videoModels: [{ id: "wan2.2-t2v", type: "video", display_name: "wan2.2-t2v", tool_names: ["hub_generate_video"], series_id: "wan2.2-t2v" }],
    audioModels: [],
  },
};

let gw: FakeGateway;
let skillsRoot: string;
beforeAll(async () => {
  gw = await startFakeGateway(DEFAULTS);
  process.env.GATEWAY_URL = gw.url;
  skillsRoot = mkdtempSync(path.join(tmpdir(), "ov-plugin-skills-"));
  process.env.HUB_SKILLS_DIR = path.join(skillsRoot, "installed");
  process.env.HUB_USER_SKILLS_DIR = path.join(skillsRoot, "user");
});
afterAll(async () => {
  await gw.close();
  delete process.env.GATEWAY_URL;
  delete process.env.HUB_SKILLS_DIR;
  delete process.env.HUB_USER_SKILLS_DIR;
});
beforeEach(() => {
  gw.reset();
  delete process.env.LOOP_GUARD_MODE;
});

const tmp = () => mkdtempSync(path.join(tmpdir(), "ov-plugin-"));
async function load(dir = tmp()): Promise<any> {
  return plugin({ directory: dir } as any);
}
const before = (h: any, tool: string, args: any, sessionID = "ses_a", callID = "call_1") => {
  const out = { args };
  return h["tool.execute.before"]({ tool, sessionID, callID }, out).then(() => out.args);
};
const after = (h: any, tool: string, args: any, sessionID = "ses_a", out: any = { title: "", output: "ok", metadata: {} }) =>
  h["tool.execute.after"]({ tool, sessionID, callID: "call_1", args }, out).then(() => out);

describe("opencode 插件", () => {
  it("没有 GATEWAY_URL 就不启动；注册的钩子和参照一致", async () => {
    const saved = process.env.GATEWAY_URL;
    delete process.env.GATEWAY_URL;
    await expect(load()).rejects.toThrow(/GATEWAY_URL must be set/);
    process.env.GATEWAY_URL = saved;
    expect(Object.keys(await load()).sort()).toEqual(
      [
        "chat.headers",
        "chat.message",
        "chat.params",
        "experimental.chat.messages.transform",
        "experimental.chat.system.transform",
        "shell.env",
        "tool.definition",
        "tool.execute.after",
        "tool.execute.before",
      ].sort(),
    );
  });

  it("system：记忆、模型名规则、工作语言依次拼到最后一条末尾；子会话按根会话取语言", async () => {
    const dir = tmp();
    mkdirSync(path.join(dir, ".hilo/memory"), { recursive: true });
    writeFileSync(path.join(dir, ".hilo/memory/style.md"), "---\nname: warm-tone\ndescription: 用户偏好暖色调画面\ntype: media-style\n---\n正文");
    process.env.HUB_MEMORY_DIR = path.join(dir, "no-user-memory");
    try {
      const h = await load(dir);
      await h["chat.message"]({ sessionID: "ses_root" }, { parts: [{ type: "text", metadata: { hilo_working_language: { locale: "zh-CN", source: "ui-preference" } } }] });
      const out = { system: ["你是助手", "尾"] };
      await h["experimental.chat.system.transform"]({ sessionID: "ses_child" }, out);
      expect(out.system).toHaveLength(2);
      const tail = out.system[1]!;
      expect(tail.startsWith("尾\n\n# Memory Context")).toBe(true);
      const iMem = tail.indexOf("- warm-tone [media-style] — 用户偏好暖色调画面");
      const iSafety = tail.indexOf("<user_visible_model_safety>");
      const iLang = tail.indexOf("<working-language>\nworking_language: zh-CN\nsource: ui-preference");
      expect(iMem).toBeGreaterThan(0);
      expect(iSafety).toBeGreaterThan(iMem);
      expect(iLang).toBeGreaterThan(iSafety);
    } finally {
      delete process.env.HUB_MEMORY_DIR;
    }
  });

  it("system：没有记忆、没有工作语言时只拼模型名规则；空 system 新加一条", async () => {
    const h = await load();
    const out = { system: [] as string[] };
    await h["experimental.chat.system.transform"]({ sessionID: "ses_none" }, out);
    expect(out.system).toHaveLength(1);
    expect(out.system[0]!.startsWith("<user_visible_model_safety>")).toBe(true);
  });

  it("hub 工具：确认后注入会话、调用 id、分组标记；plan 强制项目根，memory 只在缺省时补；模型自己编的内部参数清掉", async () => {
    const dir = tmp();
    const h = await load(dir);
    const args = await before(h, "hub_generate_image", { prompt: "猫", _group_id: "999", _chat_turn_id: "x" });
    expect(args).toEqual({ prompt: "猫", _session_id: "ses_a", _group_scope: "legacy", _tool_use_id: "call_1" });
    expect((await before(h, "hub_plan_write", { projectRoot: "/elsewhere" })).projectRoot).toBe(dir);
    expect((await before(h, "hub_memory", { projectRoot: "/mine" })).projectRoot).toBe("/mine");
    expect((await before(h, "hub_memory", { projectRoot: "" })).projectRoot).toBe(dir);
    expect(await before(h, "read", { file_path: "a" })).toEqual({ file_path: "a" });
    const confirm = gw.calls.find((c) => c.path.endsWith("/tool-confirm/ask"))!;
    expect(confirm.body).toEqual({ tool: "hub_generate_image", args: { prompt: "猫", _group_id: "999", _chat_turn_id: "x" }, timeout_ms: 300_000 });
  });

  it("hub 工具：取不到分组标 unresolved；有分组和 turn 时带上并登记输入附件", async () => {
    const h = await load();
    gw.routes.set("/request-group", status(500));
    expect((await before(h, "hub_generate_image", { prompt: "猫" }))._group_scope).toBe("unresolved");
    gw.routes.set("/request-group", { mode: "canonical", group_id: "42", chat_turn_id: "0123456789abcdef0123456789abcdef" });
    const args = await before(h, "hub_generate_video", { prompt: "猫", image_paths: ["/w/a.png"] });
    expect(args).toMatchObject({ _group_id: "42", _chat_turn_id: "0123456789abcdef0123456789abcdef" });
    expect(args._group_scope).toBeUndefined();
    const obs = gw.calls.find((c) => c.path.endsWith("/attachment-observations"))!;
    expect(obs.body).toEqual({ paths: ["/w/a.png"], direction: "input", tool_call_id: "call_1", chat_turn_id: "0123456789abcdef0123456789abcdef" });
  });

  it("回连 gateway 带上工作区身份头", async () => {
    Object.assign(process.env, { HILO_WORKSPACE_CLAIM: "abc", HILO_WORKSPACE_INSTANCE_ID: "inst", HILO_WORKSPACE_GENERATION: "4" });
    try {
      const h = await load();
      await before(h, "hub_generate_image", { prompt: "猫" });
      for (const c of gw.calls) {
        expect(c.headers).toMatchObject({ "x-hilo-workspace": "abc", "x-hilo-workspace-instance": "inst", "x-hilo-workspace-generation": "4" });
      }
    } finally {
      delete process.env.HILO_WORKSPACE_CLAIM;
      delete process.env.HILO_WORKSPACE_INSTANCE_ID;
      delete process.env.HILO_WORKSPACE_GENERATION;
    }
  });

  it("工具确认：拒绝就抛错；改了参数就合并并记一笔", async () => {
    const h = await load();
    gw.routes.set("/tool-confirm/ask", { decision: "reject", reject_reason: "user_rejected" });
    await expect(before(h, "hub_generate_image", { prompt: "猫" })).rejects.toThrow(/^\[tool-confirm-reject:user_rejected\] User rejected this tool call/);
    gw.routes.set("/tool-confirm/ask", { decision: "confirm", modified_args: { prompt: "狗", _internal: 1 } });
    const args = await before(h, "hub_generate_image", { prompt: "猫" }, "ses_b");
    expect(args.prompt).toBe("狗");
    expect(args._user_override_note).toBe('User manually modified: prompt: "猫" -> "狗". Accept result as-is, do not retry with original parameters.');
  });

  it("gateway 连不上时：花钱的工具拒绝，其余放行", async () => {
    const saved = process.env.GATEWAY_URL;
    process.env.GATEWAY_URL = "http://127.0.0.1:1";
    try {
      const h = await load();
      await expect(before(h, "hub_generate_video", { prompt: "x" })).rejects.toThrow(/confirmation_unavailable/);
      await expect(before(h, "hub_canvas_list_nodes", {})).resolves.toMatchObject({ _group_scope: "unresolved" });
    } finally {
      process.env.GATEWAY_URL = saved;
    }
  });

  it("防打转：同样的调用第 3 次问 gateway 并上报，拒绝就拦下；新的一轮用户消息清零", async () => {
    const h = await load();
    const run = async () => {
      const args = await before(h, "hub_generate_image", { prompt: "一只猫", model_id: "m" }, "ses_loop");
      await after(h, "hub_generate_image", { prompt: "一只猫", model_id: "m" }, "ses_loop");
      return args;
    };
    await run();
    await run();
    await expect(run()).rejects.toThrow(/LoopGuard blocked: tool "hub_generate_image" was called with semantically-identical arguments 3 times/);
    const ask = gw.calls.find((c) => c.path.endsWith("/loop-guard/ask"))!;
    expect(ask.body).toMatchObject({ tool: "hub_generate_image", hits: 3, window: 5, recent_tools: ["hub_generate_image", "hub_generate_image"] });
    await new Promise((r) => setTimeout(r, 50));
    expect(gw.calls.some((c) => c.path.endsWith("/ses_loop/loop-guard-trip"))).toBe(true);
    expect(gw.calls.some((c) => c.path.endsWith("/ses_loop/mcp-tool-call"))).toBe(true);
    await h["chat.message"]({ sessionID: "ses_loop" }, { parts: [] });
    await expect(run()).resolves.toBeTruthy();
  });

  it("防打转 block 模式不问 gateway；被拦的调用不进历史", async () => {
    process.env.LOOP_GUARD_MODE = "block";
    const h = await load();
    const read = async () => {
      await before(h, "read", { filePath: "/a", offset: 1 }, "ses_blk");
      await after(h, "read", { filePath: "/a", offset: 1 }, "ses_blk");
    };
    await read();
    await read();
    await expect(read()).rejects.toThrow(/LoopGuard blocked/);
    await expect(before(h, "read", { filePath: "/b" }, "ses_blk")).resolves.toBeTruthy();
    expect(gw.calls.some((c) => c.path.endsWith("/loop-guard/ask"))).toBe(false);
  });

  it("question：推荐项挪到前面；选模型的选项对照 gateway 目录；描述补格式提醒", async () => {
    const h = await load();
    const args = await before(h, "question", { questions: [{ header: "风格", options: [{ label: "A" }, { label: "B（推荐）" }] }] });
    expect(args.questions[0].options.map((o: any) => o.label)).toEqual(["B（推荐）", "A"]);
    expect(gw.calls.some((c) => c.path === "/api/models")).toBe(false);

    const ok = { questions: [{ header: "视频模型", question: "选择视频模型", options: [{ label: "自动" }, { label: "wan2.2-t2v（推荐）" }] }] };
    await expect(before(h, "question", ok)).resolves.toBeTruthy();
    const bad = { questions: [{ header: "视频模型", question: "选择视频模型", options: [{ label: "Kling 2.1" }] }] };
    await expect(before(h, "question", bad)).rejects.toThrow(/Use a concrete exact display_name from: wan2\.2-t2v\./);

    const def = { description: "Ask the user", parameters: {} };
    await h["tool.definition"]({ toolID: "question" }, def);
    expect(def.description).toContain("## CRITICAL: `questions` parameter must be a JSON array, not a stringified JSON");
    const other = { description: "Read", parameters: {} };
    await h["tool.definition"]({ toolID: "read" }, other);
    expect(other.description).toBe("Read");
  });

  it("task：斜杠命令交给通用 agent 被拦，交给具名 agent 放行", async () => {
    const h = await load();
    await expect(before(h, "task", { prompt: "/deploy now", subagent_type: "general" })).rejects.toThrow(
      '"/deploy now" is not a recognized slash command or skill. Do NOT retry with the task tool.',
    );
    await expect(before(h, "task", { prompt: "/deploy", subagent_type: "media-agent", description: "d" })).resolves.toBeTruthy();
  });

  it("技能授权：加载技能后同一轮就把声明的 hub 工具追加到当前 agent；之后每次请求补到根会话下的对应 agent", async () => {
    mkdirSync(path.join(skillsRoot, "installed", "promo"), { recursive: true });
    writeFileSync(
      path.join(skillsRoot, "installed", "promo", "SKILL.md"),
      "---\nname: promo\nallowed-tools: [question, hub_generate_video]\nallowed-tools-executor: [hub_analyse_media]\n---\n正文",
    );
    _resetSkillMetaCacheForTests();
    const h = await load();
    const media = { name: "media-agent", permission: [{ permission: "*", action: "deny", pattern: "*" }] };
    await h["chat.params"]({ sessionID: "ses_root", agent: media, model: { providerID: "maas", limit: { output: 8000 } } }, { maxOutputTokens: undefined });
    await before(h, "skill", { name: "promo" }, "ses_root");
    expect(media.permission.slice(1)).toEqual([{ permission: "hub_generate_video", action: "allow", pattern: "*" }]);

    // 子会话里的 executor：chat.params 时从根会话取到授权。
    const executor = { name: "executor", permission: [] as unknown[] };
    await h["chat.params"]({ sessionID: "ses_child", agent: executor, model: { providerID: "maas" } }, {});
    expect(executor.permission).toEqual([{ permission: "hub_analyse_media", action: "allow", pattern: "*" }]);
    // 自带技能不请求上传检查。
    await new Promise((r) => setTimeout(r, 50));
    expect(gw.calls.some((c) => c.path === "/api/skills/upload-check")).toBe(false);
  });

  it("chat.params：只有自配模型按上限给输出长度", async () => {
    const h = await load();
    const out1: any = {};
    await h["chat.params"]({ sessionID: "s", agent: "media-agent", model: { providerID: "user-custom-abc", limit: { output: 64000 } } }, out1);
    expect(out1.maxOutputTokens).toBe(64000);
    const out2: any = {};
    await h["chat.params"]({ sessionID: "s", agent: "media-agent", model: { providerID: "maas", limit: { output: 64000 } } }, out2);
    expect(out2.maxOutputTokens).toBeUndefined();
  });

  it("chat.headers：legacy 照常发并带上用户附件引用；取不到分组拒发；自配模型不管", async () => {
    const h = await load();
    gw.routes.set("/attachment-observations", { attachment_refs: [{ attachment_source: "asset_vault", attachment_id: "as_1" }] });
    await h["chat.message"]({ sessionID: "ses_h" }, { parts: [{ type: "text", text: "[User attached files:\n- /w/cat.png\n]\n\n做视频" }] });
    const out = { headers: {} as Record<string, string> };
    await h["chat.headers"]({ sessionID: "ses_h", model: { providerID: "maas", modelID: "m" } }, out);
    expect(out.headers).toEqual({ "X-Hilo-Attachment-Refs": JSON.stringify([{ attachment_source: "asset_vault", attachment_id: "as_1", direction: "input" }]) });

    gw.routes.set("/request-group", { mode: "canonical", group_id: "5", chat_turn_id: "0123456789abcdef0123456789abcdef" });
    const out2 = { headers: {} as Record<string, string> };
    await h["chat.headers"]({ sessionID: "ses_none", model: { providerID: "maas" } }, out2);
    expect(out2.headers).toEqual({ "X-Chat-Turn-Id": "0123456789abcdef0123456789abcdef", "X-Group-Id": "5" });

    gw.routes.set("/request-group", status(500));
    await expect(h["chat.headers"]({ sessionID: "ses_h", model: { providerID: "maas" } }, { headers: {} })).rejects.toThrow(/^REQUEST_GROUP_UNAVAILABLE/);
    const before = gw.calls.length;
    await h["chat.headers"]({ sessionID: "ses_h", model: { providerID: "user-custom-x" } }, { headers: {} });
    expect(gw.calls.length).toBe(before);
  });

  it("question 回答里附了文件：登记后写进工具结果 metadata", async () => {
    const h = await load();
    gw.routes.set("/attachment-observations", { attachment_refs: [{ attachment_source: "asset_vault", attachment_id: "as_q" }] });
    const out = await after(h, "question", {}, "ses_q", { title: "", output: "", metadata: { answers: [["[User attached files:\n- /w/ref.png\n]"]] } });
    expect(out.metadata.attachment_refs).toEqual([{ attachment_source: "asset_vault", attachment_id: "as_q", tool_call_id: "call_1", direction: "input" }]);
  });

  it("压缩后的合成续写消息补语言提示（子会话沿根会话取）", async () => {
    const h = await load();
    await h["chat.message"]({ sessionID: "ses_root" }, { parts: [{ metadata: { hilo_working_language: { locale: "zh-CN", source: "session" } } }] });
    const out = {
      messages: [{ info: { role: "user", sessionID: "ses_c" }, parts: [{ type: "text", synthetic: true, sessionID: "ses_c", text: "Continue if you have next steps" }] }],
    };
    await h["experimental.chat.messages.transform"]({}, out);
    expect(out.messages[0]!.parts[0]!.text).toBe("Continue if you have next steps\n\n[language] 请用中文回复。");
  });

  it("shell.env：只在 Windows 补 UTF-8，已有的不覆盖", async () => {
    const h = await load();
    const out = { env: { LANG: "en_US.UTF-8" } as Record<string, string> };
    await h["shell.env"]({ cwd: "/" }, out);
    if (process.platform === "win32") expect(out.env).toMatchObject({ LANG: "en_US.UTF-8", LC_ALL: "C.UTF-8", PYTHONUTF8: "1" });
    else expect(out.env).toEqual({ LANG: "en_US.UTF-8" });
  });
});
