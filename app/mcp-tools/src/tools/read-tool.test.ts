import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText } from "../testing/harness.js";
import { registerV3Tools } from "./v3-tools.js";

/**
 * `design_read` 的两条来源各走各的接口：
 *
 * - `versionId` → `POST /api/v3/query/document_read`（Resource 版本正文，带 contentRevision）
 * - `file_path` → `GET /api/internal/document/read`（磁盘文件/目录）
 *
 * 之前两条都被写成了 `GET /api/project/resources/read` —— 那条路由从来没存在过，
 * 所以 agent 每次 read 都 404、只能退回 bash 去 cat。这两条用例把接线钉住。
 */
describe("design_read 的接线", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;

  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => {
    await gw.close();
  });

  it("versionId：走 query/document_read，offset/limit 映射成 startLine/lineCount", async () => {
    gw.on("POST", "/api/v3/query/document_read", {
      json: { versionId: "ver_1", contentRevision: 7, text: "一\n二", startLine: 3, lineCount: 2, totalLines: 9, more: true },
    });
    const r = await h.call("read", { versionId: "ver_1", offset: 3, limit: 2, contentRevision: 7 });
    const body = resultJson(r) as Record<string, unknown>;
    expect(body).toMatchObject({ versionId: "ver_1", contentRevision: 7, startLine: 3, lineCount: 2, totalLines: 9, more: true, nextOffset: 5 });
    expect(resultText(r)).toContain("一\\n二");
    const sent = gw.requests.find((req) => req.path === "/api/v3/query/document_read");
    expect(sent?.body).toEqual({ versionId: "ver_1", startLine: 3, lineCount: 2, contentRevision: 7 });
  });

  it("file_path：走 internal/document/read，并把 query 原样带上", async () => {
    gw.on("GET", "/api/internal/document/read", {
      json: { ok: true, kind: "text", lines: ["a", "b"], offset: 1, totalLines: 12, more: true },
    });
    const r = await h.call("read", { file_path: "/data/.config-v2/knowledge/vendors/minimax.md", limit: 2 });
    const body = resultJson(r) as Record<string, unknown>;
    expect(body).toMatchObject({ kind: "text", startLine: 1, lineCount: 2, totalLines: 12, nextOffset: 3 });
    const sent = gw.requests.find((req) => req.path === "/api/internal/document/read");
    expect(sent?.query.get("path")).toBe("/data/.config-v2/knowledge/vendors/minimax.md");
    expect(sent?.query.get("limit")).toBe("2");
  });

  it("file_path 失败时把后端 reason 翻译成人话，而不是 404 堆栈", async () => {
    gw.on("GET", "/api/internal/document/read", { json: { ok: false, reason: "not-found" } });
    const r = await h.call("read", { file_path: "/nope.md" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toContain("file not found");
  });

  it("两个都给或都不给：直接报错，不打后端", async () => {
    const both = await h.call("read", { versionId: "ver_1", file_path: "/a.md" });
    expect(both.isError).toBe(true);
    const neither = await h.call("read", {});
    expect(neither.isError).toBe(true);
    expect(gw.requests).toHaveLength(0);
  });
});

/** 另外两条同类接线问题：capability_list 的逗号拼接、composition_type_list 的裸数组。 */
describe("capability_list / composition_type_list 的接线", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;

  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => {
    await gw.close();
  });

  it("capability_list：多个 operation 用重复参数（不要逗号拼）", async () => {
    gw.on("GET", "/api/v3/capabilities", { json: { capabilities: [] } });
    await h.call("capability_list", { operation: ["generate_image", "generate_video"] });
    const sent = gw.requests.find((req) => req.path === "/api/v3/capabilities");
    expect(sent?.query.getAll("operation")).toEqual(["generate_image", "generate_video"]);
  });

  it("composition_type_list：网关返回裸数组时包成对象", async () => {
    gw.on("POST", "/api/project/compositions/types/list", { json: [{ typeId: "cty_1", label: "视频" }] });
    const r = await h.call("composition_type_list", {});
    expect(resultJson(r)).toEqual({ types: [{ typeId: "cty_1", label: "视频" }] });
  });
});

/** `document_write` 走的是 `/api/v3/document`，不是 resource commands。 */
describe("document_write 的接线", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;

  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => {
    await gw.close();
  });

  it("打到 /api/v3/document，并带上模型给的 requestId", async () => {
    gw.on("POST", "/api/v3/document", { json: { ok: true, versionId: "ver_1" } });
    const r = await h.call("document_write", { requestId: "req-1", mode: "create", name: "方案", content: "# 方案" });
    expect(resultJson(r)).toMatchObject({ ok: true, versionId: "ver_1" });
    const sent = gw.requests.find((req) => req.path === "/api/v3/document");
    expect(sent?.body).toMatchObject({ requestId: "req-1", mode: "create", content: "# 方案" });
  });

  it("模型漏传 requestId 时自动补一个稳定的 id（不再被 zod 挡下）", async () => {
    gw.on("POST", "/api/v3/document", { json: { ok: true, versionId: "ver_2" } });
    const r = await h.call("document_write", { mode: "create", name: "方案", content: "# 方案" });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/document");
    expect(String((sent?.body as { requestId?: string })?.requestId)).toMatch(/^[a-z-]+[0-9a-f]{8,}$/);

    // 同样的参数再来一次 → 同一个 id（重试仍然幂等）。
    const again = await h.call("document_write", { mode: "create", name: "方案", content: "# 方案" });
    const second = gw.requests.filter((req) => req.path === "/api/v3/document").at(-1);
    expect((second?.body as { requestId?: string })?.requestId).toBe((sent?.body as { requestId?: string })?.requestId);
    expect(again.isError).toBeUndefined();
  });
});

/** 模型会给必填字段加下划线前缀（把 `_session_id` 当命名规范），要能兜住。 */
describe("下划线别名字段", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;
  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => { await gw.close(); });

  it("composition_edit：模型传 _action/_name 时按正式字段处理", async () => {
    gw.on("POST", "/api/project/compositions/commands", { json: { ok: true } });
    const r = await h.call("composition_edit", { _action: "ensure", _typeId: "cty_1", _name: "视频" });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/project/compositions/commands");
    const cmd = (sent?.body as { command?: Record<string, unknown> })?.command ?? {};
    expect(cmd).toMatchObject({ action: "ensure", typeId: "cty_1", name: "视频" });
  });
});

/** 模型把数组/对象/数字写成字符串（qwen3.8 的稳定习惯），要能修回来。 */
describe("字符串化的参数", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;
  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => { await gw.close(); });

  it("capability_get：ids 是 JSON 字符串 → 变成数组", async () => {
    gw.on("GET", "/api/v3/capabilities", { json: { capabilities: [] } });
    const r = await h.call("capability_get", { ids: '["generate_video:minimax-h3-2k"]' });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/capabilities");
    expect(sent?.query.get("ids")).toBe("generate_video:minimax-h3-2k");
  });

  it("capability_get：模型用了 capabilityIds 这个错名字 → 当 ids", async () => {
    gw.on("GET", "/api/v3/capabilities", { json: { capabilities: [] } });
    const r = await h.call("capability_get", { capabilityIds: '["generate_video:minimax-h3-2k"]' });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/capabilities");
    expect(sent?.query.get("ids")).toBe("generate_video:minimax-h3-2k");
  });

  it("composition_edit：整份参数塞在 ensure 这个键里 → 拆成 action + 字段", async () => {
    gw.on("POST", "/api/project/compositions/commands", { json: { ok: true } });
    const r = await h.call("composition_edit", {
      ensure: JSON.stringify({
        composition: { name: "香水" },
        operations: [{ action: "add_member", clientMemberKey: "plan", role: "方案", versionId: "ver_1" }],
      }),
    });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/project/compositions/commands");
    const cmd = (sent?.body as { command?: Record<string, unknown> })?.command ?? {};
    expect(cmd).toMatchObject({ action: "ensure" });
    // 只断言"整份参数被拆开并原样转发了"，具体变体字段由 schema 归一。
    expect((cmd.operations as unknown[])[0]).toMatchObject({ action: "add_member", clientMemberKey: "plan", role: "方案" });
  });

  it("document_write：content 有、mode 漏传 → 推断成 create", async () => {
    gw.on("POST", "/api/v3/document", { json: { ok: true } });
    const r = await h.call("document_write", { name: "方案", content: "# 方案" });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/document");
    expect((sent?.body as { mode?: string })?.mode).toBe("create");
  });

  it("deliver：打到 /api/v3/deliveries 并解包 delivery", async () => {
    gw.on("POST", "/api/v3/deliveries", { json: { delivery: { committed: true, resourceIds: ["res_1"], compositionId: "cmp_1" } } });
    const r = await h.call("deliver", {
      requestId: "dl-1",
      sources: [{ key: "film", path: "out/film.mp4" }],
      output: { resources: [{ key: "film", mode: "create", name: "成片" }] },
    });
    expect(r.isError).toBeUndefined();
    expect(resultJson(r)).toMatchObject({ committed: true, compositionId: "cmp_1" });
    expect(gw.requests.some((req) => req.path === "/api/v3/deliveries")).toBe(true);
  });

  it("deliver：sources/output 是 JSON 字符串 → 解析成数组和对象", async () => {
    gw.on("POST", "/api/v3/deliveries", { json: { ok: true } });
    const r = await h.call("deliver", {
      requestId: "d-1",
      sources: '[{"key":"plan","path":"files/x.md"}]',
      output: '{"resources":[{"key":"plan","mode":"create","name":"方案"}]}',
    });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/deliveries");
    const body = sent?.body as { sources?: unknown; output?: unknown };
    expect(Array.isArray(body?.sources)).toBe(true);
    expect(typeof body?.output).toBe("object");
  });
});

/** code_checkpoint / code_publish 的真实失败形状（来自 MG 动画那次真机运行）。 */
describe("code_* 工具的参数兜底", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;
  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => { await gw.close(); });

  it("code_checkpoint：模型写 note，schema 要 message", async () => {
    gw.on("POST", "/api/v3/code-projects/checkpoint", { json: { ok: true } });
    const r = await h.call("code_checkpoint", { note: "渲染管线跑通，抽帧亮度验证通过" });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/code-projects/checkpoint");
    expect((sent?.body as { message?: string })?.message).toContain("渲染管线跑通");
  });

  it("analyse_media：打到 /api/v3/analyse", async () => {
    gw.on("POST", "/api/v3/analyse", { json: { type: "semantic", results: [{ reference: { versionId: "ver_1" }, semantic: { text: "一只猫" } }] } });
    const r = await h.call("analyse_media", { references: [{ versionId: "ver_1", question: "画面里有什么" }], type: "semantic" });
    expect(r.isError).toBeUndefined();
    expect(gw.requests.some((req) => req.path === "/api/v3/analyse")).toBe(true);
  });

  it("analyse_media：传本地路径时给出可执行的报错（而不是 Required at references）", async () => {
    // 参数预检发生在 schema 解析之前，所以这里表现为抛错；关键是**消息可执行**。
    await expect(h.call("analyse_media", { file_path: "/tmp/frame.png", question: "看看字" })).rejects.toThrow(/只接受项目 Resource/);
  });

  it("code_publish：数组里 {key, path} 与 {key, source:\"path\"} 都归一成 source.path", async () => {
    gw.on("POST", "/api/v3/code-projects/publish", { json: { ok: true } });
    const r = await h.call("code_publish", {
      requestId: "pub-2",
      outputs: [
        { key: "a", path: "out/a.png" },
        { key: "b", source: "out/b.png" },
      ],
      output: { resources: [{ key: "a", mode: "create", name: "预览图" }] },
    });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/code-projects/publish");
    expect((sent?.body as { outputs?: unknown })?.outputs).toEqual([
      { key: "a", source: { path: "out/a.png" } },
      { key: "b", source: { path: "out/b.png" } },
    ]);
  });

  it("code_publish：模型只给 outputs（含 kind/goal），缺 output 时按 outputs 推断", async () => {
    gw.on("POST", "/api/v3/code-projects/publish", { json: { ok: true } });
    const r = await h.call("code_publish", {
      requestId: "pub-3",
      message: "交付成片",
      outputs: [{ key: "film", path: "out/film.mp4", kind: "video", goal: "MiniMax Design 15s 快闪MG成片" }],
    });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/code-projects/publish");
    const body = sent?.body as { outputs?: unknown; output?: unknown };
    expect(body.outputs).toEqual([{ key: "film", source: { path: "out/film.mp4" } }]);
    expect(body.output).toEqual({ resources: [{ key: "film", mode: "create", name: "MiniMax Design 15s 快闪MG成片" }] });
  });

  it("code_checkpoint：什么都没给时也补一句，不让整轮失败", async () => {
    gw.on("POST", "/api/v3/code-projects/checkpoint", { json: { ok: true } });
    const r = await h.call("code_checkpoint", {});
    expect(r.isError).toBeUndefined();
  });

  it("code_publish：outputs 写成 {key:{path}} 对象 → 展开成数组", async () => {
    gw.on("POST", "/api/v3/code-projects/publish", { json: { ok: true } });
    const r = await h.call("code_publish", {
      requestId: "pub-1",
      outputs: '{"film":{"path":"out/final.mp4"}}',
      output: { resources: [{ key: "film", mode: "create", name: "快闪MG动画成片" }] },
    });
    expect(r.isError).toBeUndefined();
    const sent = gw.requests.find((req) => req.path === "/api/v3/code-projects/publish");
    expect((sent?.body as { outputs?: unknown })?.outputs).toEqual([{ key: "film", source: { path: "out/final.mp4" } }]);
  });
});
