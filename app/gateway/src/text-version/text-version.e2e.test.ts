import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { parseSummaryPayload } from "./text-version-summary.service.js";
import { computeLineDiffHunks } from "./text-line-diff.js";

describe("文本版本历史", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let assetId = "";
  const events: any[] = [];

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-textver-"));
    process.env.WORKSPACE_DIR = ws;
    // 没有平台配置：AI 摘要应回 503，而不是去连任何远端。
    delete process.env.OV_CONFIG_PATH;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
    writeFileSync(path.join(ws, "doc.md"), "# 标题\n\n第一段\n");
    assetId = (await app.get(AssetsService).enroll("doc.md")).id;
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("list：参数缺失 400，未知文档 404，首次列出时补一份 initial 基线", async () => {
    expect((await http.get("/api/files/versions")).status).toBe(400);
    expect((await http.get("/api/files/versions?path=nope.md")).status).toBe(404);
    const r = await http.get(`/api/files/versions?path=doc.md`);
    expect(r.status).toBe(200);
    expect(r.body.versions).toHaveLength(1);
    expect(r.body.versions[0]).toMatchObject({ assetId, seq: 1, origin: "initial", title: "", pinned: false, objectState: "present", relPath: "doc.md" });
    expect(r.body.quota).toMatchObject({ maxPerDocument: 20, workspaceQuotaExceeded: false });
    // 并发列出也只会有一份基线。
    await Promise.all([1, 2, 3].map(() => http.get(`/api/files/versions?assetId=${assetId}`)));
    expect((await http.get(`/api/files/versions?assetId=${assetId}`)).body.versions).toHaveLength(1);
  });

  let v2 = "";
  it("save / diff / content：保存当前内容，和当前盘上内容对比", async () => {
    writeFileSync(path.join(ws, "doc.md"), "# 标题\n\n第一段改过了\n\n第二段\n");
    const s = await http.post("/api/files/versions").send({ path: "doc.md", title: "  第二版  ", nodeId: "n1" });
    expect(s.status).toBe(201);
    expect(s.body).toMatchObject({ ok: true, deduped: false, prunedIds: [] });
    expect(s.body.version).toMatchObject({ seq: 2, title: "第二版", origin: "manual", nodeId: "n1" });
    v2 = s.body.version.id;
    const base = s.body.version.baseVersionId;
    expect(base).toBeTruthy();

    const d = await http.get(`/api/files/versions/diff?from=${base}&to=${v2}`);
    expect(d.status).toBe(200);
    expect(d.body).toMatchObject({ offset: 0, total: 1, truncated: false, coarse: false, tier: "S" });
    expect(d.body.addedLines).toBeGreaterThan(0);
    const kinds = d.body.hunks[0].lines.map((l: any) => l.kind);
    expect(kinds).toContain("add");

    // 不给 to：和当前盘上内容比，完全一样时没有 hunk。
    expect((await http.get(`/api/files/versions/diff?from=${v2}`)).body.total).toBe(0);
    expect((await http.get(`/api/files/versions/diff`)).status).toBe(400);

    const c = await http.get(`/api/files/versions/${v2}/content?offset=0&limit=5`);
    expect(c.status).toBe(200);
    expect(c.body).toMatchObject({ offset: 0, eof: false, tier: "S" });
    // 按字节窗口截断时不回半个汉字。
    expect(c.body.content).toBe("# 标");
    const all = await http.get(`/api/files/versions/${v2}/content`);
    expect(all.body.content).toBe("# 标题\n\n第一段改过了\n\n第二段\n");
    expect(all.body.eof).toBe(true);
    expect((await http.get(`/api/files/versions/nope/content`)).status).toBe(404);
  });

  it("save：内容没变时复用同一个对象", async () => {
    const s = await http.post("/api/files/versions").send({ assetId });
    expect(s.body.deduped).toBe(true);
    expect(s.body.version.contentHash).toBeDefined();
    await http.delete(`/api/files/versions/${s.body.version.id}`).expect(200, { ok: true });
  });

  it("patch：改名、备注、钉住", async () => {
    const r = await http.patch(`/api/files/versions/${v2}`).send({ title: "定稿", note: "改了第一段", pinned: true });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ title: "定稿", note: "改了第一段", noteSource: "manual", pinned: true });
    expect((await http.patch(`/api/files/versions/${v2}`).send({ bogus: 1 })).status).toBe(400);
  });

  it("restore：先存还原前快照，再用旧版本覆盖文件，并通知引用它的文本节点", async () => {
    writeFileSync(path.join(ws, "doc.md"), "完全不同的内容\n");
    const list = (await http.get(`/api/files/versions?assetId=${assetId}`)).body.versions;
    const initial = list.find((v: any) => v.origin === "initial");
    const r = await http.post(`/api/files/versions/${initial.id}/restore`).send({ nodeId: "n1" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ ok: true, path: "doc.md" });
    expect(r.body.autoSnapshot).toMatchObject({ origin: "restore", restoredFromVersionId: initial.id, title: "" });
    expect(readFileSync(path.join(ws, "doc.md"), "utf8")).toBe("# 标题\n\n第一段\n");
    // 快照里存的是被覆盖前的内容。
    const snap = await http.get(`/api/files/versions/${r.body.autoSnapshot.id}/content`);
    expect(snap.body.content).toBe("完全不同的内容\n");
  });

  it("materialize：把版本另存为工作区根目录下的新文本资产", async () => {
    const r = await http.post(`/api/files/versions/${v2}/materialize`);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ ok: true, path: "定稿.md", name: "定稿.md" });
    expect(readFileSync(path.join(ws, "定稿.md"), "utf8")).toBe("# 标题\n\n第一段改过了\n\n第二段\n");
    expect(app.get(AssetsService).byPath("定稿.md")?.id).toBe(r.body.assetId);
    const again = await http.post(`/api/files/versions/${v2}/materialize`);
    expect(again.body.path).toBe("定稿-2.md");
  });

  it("delete：最后一个引用没了就删对象；不存在的 id 也回 ok", async () => {
    const s = await http.post("/api/files/versions").send({ path: "doc.md" });
    writeFileSync(path.join(ws, "doc.md"), "独一份\n");
    const u = await http.post("/api/files/versions").send({ path: "doc.md" });
    const hash = u.body.version.contentHash as string;
    const dir = path.join(ws, ".hilo", "text-versions", "objects", hash.slice(0, 2));
    const obj = path.join(dir, `${hash}.${u.body.version.codec === "zstd" ? "zst" : "gz"}`);
    expect(existsSync(obj)).toBe(true);
    await http.delete(`/api/files/versions/${u.body.version.id}`).expect(200, { ok: true });
    expect(existsSync(obj)).toBe(false);
    await http.delete(`/api/files/versions/${s.body.version.id}`).expect(200);
    await http.delete(`/api/files/versions/nope`).expect(200, { ok: true });
  });

  it("summarize：没配对话模型时回 503，不去连远端", async () => {
    const r = await http.post("/api/files/versions/summarize").send({ path: "doc.md" });
    expect(r.status).toBe(503);
  });

  it("每个文档最多 20 个版本，超出时先淘汰最老的未钉住版本", async () => {
    for (let i = 0; i < 22; i++) {
      writeFileSync(path.join(ws, "doc.md"), `第 ${i} 次\n`);
      await http.post("/api/files/versions").send({ path: "doc.md" }).expect(201);
    }
    const list = (await http.get(`/api/files/versions?path=doc.md`)).body.versions;
    expect(list).toHaveLength(20);
    expect(list.some((v: any) => v.id === v2 && v.pinned)).toBe(true);
  });
});

describe("按行 diff / 摘要解析", () => {
  it("忽略只动了空白的改动；纯删除显示成删掉的行", () => {
    expect(computeLineDiffHunks("a  b\n", "a b\n", { contextLines: 3, maxHunks: 10, ignoreWhitespace: true }).total).toBe(0);
    const r = computeLineDiffHunks("一二三四\n", "一四\n", { contextLines: 0, maxHunks: 10 });
    expect(r.hunks[0]!.lines.map((l) => l.kind)).toEqual(["del", "retained"]);
    expect(r.removedLines).toBe(1);
    expect(r.addedLines).toBe(0);
  });

  it("模型回的 JSON 带围栏、标题带句号时清洗掉；不是 JSON 就整段当备注", () => {
    expect(parseSummaryPayload('```json\n{"title":"标题：改了开头。","note":"备注"}\n```')).toEqual({ title: "改了开头", note: "备注" });
    expect(parseSummaryPayload("just a note")).toEqual({ title: "", note: "just a note" });
  });
});
