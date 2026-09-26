import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { MediaConfigService } from "../generate/media-config.service.js";

describe("记忆管理与压缩", () => {
  let app: INestApplication;
  let ws: string;
  let userDir: string;
  let http: ReturnType<typeof request>;
  const events: any[] = [];
  let llmReply = "";
  let llmCalls = 0;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-memory-ws-"));
    userDir = path.join(mkdtempSync(path.join(tmpdir(), "ov-memory-user-")), "memory");
    const cfg = path.join(ws, "..", `ov-memory-cfg-${path.basename(ws)}.json`);
    writeFileSync(cfg, JSON.stringify({ platform: { base_url: "http://platform.invalid/v1", api_key: "k", chat_model: "local-chat" }, models: {} }));
    process.env.WORKSPACE_DIR = ws;
    process.env.HUB_MEMORY_DIR = userDir;
    process.env.OV_CONFIG_PATH = cfg;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
    // 对话模型桩：不出网。
    app.get(MediaConfigService).clientOverrides = {
      sleep: async () => undefined,
      logger: { info() {}, warn() {} },
      fetch: (async () => {
        llmCalls += 1;
        return new Response(JSON.stringify({ choices: [{ message: { content: llmReply }, finish_reason: "stop" }] }), { status: 200 });
      }) as typeof fetch,
    };
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HUB_MEMORY_DIR;
    delete process.env.OV_CONFIG_PATH;
  });

  const write = (body: Record<string, unknown>) => http.post("/api/memory").send(body);

  it("写入：落成带 frontmatter 的文件并重建索引，广播 memory_changed", async () => {
    const r = await write({ scope: "user", name: "likes-tea", type: "user", description: "喜欢喝茶", body: "每天下午一杯乌龙" });
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(true);
    expect(r.body.path).toBe(path.join(userDir, "user_likes-tea.md"));
    expect(readFileSync(r.body.path, "utf8")).toContain("description: 喜欢喝茶");
    expect(readFileSync(path.join(userDir, "MEMORY.md"), "utf8")).toContain("- [likes-tea](user_likes-tea.md) — 喜欢喝茶");
    expect(events.at(-1)).toEqual({ event: "memory:changed", payload: { type: "memory_changed", scope: "user", name: "likes-tea", action: "created" } });
    const again = await write({ scope: "user", name: "likes-tea", type: "user", description: "喜欢喝茶", body: "改成绿茶" });
    expect(again.body.created).toBe(false);
    expect(events.at(-1).payload.action).toBe("updated");
    await write({ scope: "project", name: "style", type: "project", description: "项目统一暖色调", body: "" }).expect(200);
    expect(existsSync(path.join(ws, ".hilo", "memory", "project_style.md"))).toBe(true);
  });

  it("写入：校验失败回 400（名字形状、多余字段、资产锚点只能在项目级）", async () => {
    expect((await write({ scope: "user", name: "Bad Name", type: "user", description: "d", body: "" })).status).toBe(400);
    expect((await write({ scope: "user", name: "ok", type: "user", description: "d", body: "", extra: 1 })).status).toBe(400);
    const pin = await write({ scope: "user", name: "pin", type: "asset-pin", description: "d", body: "", asset_uri: "hilo://asset/a1", asset_modality: "image" });
    expect(pin.status).toBe(400);
    expect(pin.body.message).toContain("requires scope='project'");
    // 接口边上放行下划线，存储层按 kebab-case 报具体原因。
    const under = await write({ scope: "user", name: "a_b", type: "user", description: "d", body: "" });
    expect(under.status).toBe(400);
    expect(under.body.message).toContain("kebab-case");
  });

  it("列表 / 搜索 / 读取", async () => {
    const all = (await http.get("/api/memory?scope=all")).body.entries;
    expect(all.map((e: any) => `${e.scope}/${e.name}`)).toEqual(["project/style", "user/likes-tea"]);
    expect((await http.get("/api/memory?scope=user")).body.entries).toHaveLength(1);
    expect((await http.get("/api/memory?scope=nope")).status).toBe(400);
    const s = await http.get(`/api/memory/search?q=${encodeURIComponent("绿茶")}`);
    expect(s.body.entries).toEqual([expect.objectContaining({ name: "likes-tea", match_in: ["body"] })]);
    expect((await http.get("/api/memory/search?q=x&type=bogus")).status).toBe(400);
    expect((await http.get("/api/memory/search")).status).toBe(400);
    const r = await http.get("/api/memory/user/likes-tea");
    expect(r.body).toMatchObject({ frontmatter: { name: "likes-tea", type: "user", description: "喜欢喝茶" }, body: "改成绿茶\n" });
    expect((await http.get("/api/memory/user/missing")).status).toBe(404);
    expect((await http.get("/api/memory/team/x")).status).toBe(400);
  });

  it("recent-auto：只列回看窗口内自动提取的记忆，新的在前", async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const old = new Date(Date.now() - 3 * 3600_000).toISOString();
    const fm = (name: string, at: string) => `---\nname: ${name}\ndescription: 自动 ${name}\ntype: feedback\nsource: auto\nextracted_at: "${at}"\n---\n\nx\n`;
    writeFileSync(path.join(userDir, "feedback_auto-new.md"), fm("auto-new", recent));
    writeFileSync(path.join(userDir, "feedback_auto-old.md"), fm("auto-old", old));
    const r = await http.get("/api/memory/recent-auto");
    expect(r.status).toBe(200);
    expect(r.body.entries.map((e: any) => e.name)).toEqual(["auto-new"]);
    expect(r.body.entries[0]).toMatchObject({ source: "auto", extracted_at: recent });
    const wide = await http.get(`/api/memory/recent-auto?lookback_ms=${6 * 3600_000}&limit=1`);
    expect(wide.body.entries.map((e: any) => e.name)).toEqual(["auto-new"]);
    await http.delete("/api/memory/user/auto-new").expect(200);
    await http.delete("/api/memory/user/auto-old").expect(200);
  });

  it("删除：删掉回 deleted:true 并广播，不存在回 deleted:false", async () => {
    await write({ scope: "user", name: "temp", type: "reference", description: "临时", body: "" }).expect(200);
    const n = events.length;
    expect((await http.delete("/api/memory/user/temp")).body).toEqual({ deleted: true });
    expect(events.slice(n).map((e) => e.payload.action)).toEqual(["deleted"]);
    expect((await http.delete("/api/memory/user/temp")).body).toEqual({ deleted: false });
  });

  it("压缩配置：读默认值，部分更新，非法值 400", async () => {
    const d = await http.get("/api/memory-compaction/config");
    expect(d.body).toMatchObject({ enabled: true, schedule: "weekly", thresholdCount: 100, snapshotRetention: 10 });
    const p = await http.post("/api/memory-compaction/config").send({ enabled: false, thresholdCount: 3 });
    expect(p.status).toBe(200);
    expect(p.body).toMatchObject({ enabled: false, thresholdCount: 3 });
    expect((await http.post("/api/memory-compaction/config").send({ schedule: "daily" })).status).toBe(400);
    expect((await http.post("/api/memory-compaction/config").send({ thresholdCount: -1 })).status).toBe(400);
  });

  it("压缩：只接受 user 作用域；预览去重 + 裁剪，执行前拍快照，可恢复", async () => {
    expect((await http.get("/api/memory-compaction/preview?scope=project")).status).toBe(400);
    await write({ scope: "user", name: "dup-a", type: "feedback", description: "回答要简短", body: "a" }).expect(200);
    await write({ scope: "user", name: "dup-b", type: "feedback", description: "  回答要简短 ", body: "b" }).expect(200);
    await write({ scope: "user", name: "extra-1", type: "reference", description: "参考一", body: "" }).expect(200);
    await write({ scope: "user", name: "extra-2", type: "reference", description: "参考二", body: "" }).expect(200);

    const quiet = await http.get("/api/memory-compaction/preview?scope=user");
    expect(quiet.body.triggers).toEqual(["count_exceeded"]);
    const plan = (await http.get("/api/memory-compaction/preview?scope=user&force=1")).body;
    expect(plan.current.count).toBe(5);
    expect(plan.operations.map((o: any) => o.type)).toEqual(["dedup", "trim"]);
    expect(plan.operations[0].deletes).toEqual(["dup-a"]);
    expect(plan.projected.count).toBe(3);

    const keep = plan.operations[1].deletes[0];
    const n = events.length;
    const r = await http.post("/api/memory-compaction/execute").send({ scope: "user", keepNames: [keep] });
    expect(r.status).toBe(200);
    // 勾选保留的那条不删：只剩去重掉的一条。
    expect(r.body.deleted).toBe(1);
    expect(r.body.snapshotId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}$/);
    expect(events.slice(n).map((e) => e.payload)).toEqual([
      expect.objectContaining({ type: "memory_changed", scope: "user", name: "*", action: "compaction", compaction: expect.objectContaining({ deleted: 1 }) }),
    ]);
    expect((await http.get("/api/memory?scope=user")).body.entries).toHaveLength(4);
    expect((await http.post("/api/memory-compaction/execute").send({ scope: "user", keepNames: [1] })).status).toBe(400);

    const snaps = (await http.get("/api/memory-compaction/snapshots?scope=user")).body.snapshots;
    expect(snaps[0]).toMatchObject({ id: r.body.snapshotId, scope: "user", entryCount: 5, reason: "compaction" });
    expect((await http.post("/api/memory-compaction/snapshots/..%2F..%2Fx/restore").send({ scope: "user" })).status).toBe(400);
    expect((await http.post("/api/memory-compaction/snapshots/bad-id/restore").send({ scope: "user" })).status).toBe(400);
    const restored = await http.post(`/api/memory-compaction/snapshots/${r.body.snapshotId}/restore`).send({ scope: "user" });
    expect(restored.status).toBe(200);
    expect(restored.body).toEqual({ restored: 5 });
    expect((await http.get("/api/memory?scope=user")).body.entries).toHaveLength(5);
    // 恢复前拍了一份安全快照。
    expect((await http.get("/api/memory-compaction/snapshots?scope=user")).body.snapshots).toHaveLength(2);
    expect(readdirSync(path.join(userDir, ".snapshots"))).toHaveLength(2);
  });

  it("合并改写：预览用平台对话模型生成计划，执行按缓存的计划落盘，同一个 proposal 不能再执行", async () => {
    llmReply = JSON.stringify([
      { name: "reference-notes", description: "参考资料汇总", type: "reference", body: "参考一；参考二", compactedFrom: ["extra-1", "extra-2"] },
    ]);
    expect((await http.post("/api/memory-compaction/rewrite/preview").send({ scope: "user", selectedNames: [] })).status).toBe(400);
    expect((await http.post("/api/memory-compaction/rewrite/preview").send({ scope: "user", selectedNames: ["ghost"] })).status).toBe(400);
    const calls = llmCalls;
    const p = await http.post("/api/memory-compaction/rewrite/preview").send({ scope: "user", selectedNames: ["extra-1", "extra-2"] });
    expect(p.status).toBe(200);
    expect(llmCalls).toBe(calls + 1);
    expect(p.body.llmModel).toBe("local-chat");
    expect(p.body.plan.operations[0]).toMatchObject({ type: "merge", deletes: ["extra-1", "extra-2"], upserts: [expect.objectContaining({ name: "reference-notes" })] });
    const x = await http.post("/api/memory-compaction/rewrite/execute").send({ scope: "user", proposalId: p.body.proposalId });
    expect(x.status).toBe(200);
    expect(x.body).toMatchObject({ deleted: 2, merged: 1 });
    const names = (await http.get("/api/memory?scope=user")).body.entries.map((e: any) => e.name);
    expect(names).toContain("reference-notes");
    expect(names).not.toContain("extra-1");
    expect((await http.post("/api/memory-compaction/rewrite/execute").send({ scope: "user", proposalId: p.body.proposalId })).status).toBe(410);
  });

  it("合并改写：模型漏掉选中的条目时回 502，不落盘", async () => {
    llmReply = JSON.stringify([{ name: "only-one", description: "x", type: "user", body: "x", compactedFrom: ["likes-tea"] }]);
    const r = await http.post("/api/memory-compaction/rewrite/preview").send({ scope: "user", selectedNames: ["likes-tea", "reference-notes"] });
    expect(r.status).toBe(502);
    expect(r.body.message).toContain("dropped 1 selected memory");
  });

  it("MCP 那边的锁残留（过期的 .lock 目录）不会卡死写入", async () => {
    const lockDir = path.join(userDir, "MEMORY.md.lock");
    mkdirSync(lockDir);
    const old = new Date(Date.now() - 60_000);
    const { utimesSync } = await import("node:fs");
    utimesSync(lockDir, old, old);
    await write({ scope: "user", name: "after-stale-lock", type: "user", description: "d", body: "" }).expect(200);
    expect(existsSync(lockDir)).toBe(false);
  });
});
