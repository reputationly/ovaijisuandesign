import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

describe("canvas：文件节点、插件存储、撤回修改、成组创建、拆图", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const events: any[] = [];
  let imageNode = "";

  const canvas = async () => (await http.get("/api/canvas")).body;
  const enroll = async (rel: string, bytes: Buffer | string, meta?: Record<string, unknown>) => {
    writeFileSync(path.join(ws, rel), bytes);
    return app.get(AssetsService).enroll(rel, meta);
  };

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-canvas-more-"));
    process.env.WORKSPACE_DIR = ws;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m.payload));
    await enroll("源图.png", PNG);
    imageNode = (await http.post("/api/canvas/media-node").send({ assetPath: "源图.png" })).body.nodeId;
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });
  beforeEach(() => {
    events.length = 0;
  });

  it("file-node：pdf 默认卡片；html 默认预览；卡片模式给宽高只警告；复用时改形状", async () => {
    await enroll("说明.pdf", "%PDF-1.4");
    const card = await http.post("/api/canvas/file-node").send({ assetPath: "说明.pdf", width: 900, viewMode: "card" });
    expect(card.status).toBe(201);
    expect(card.body).toMatchObject({ fileType: "pdf", viewMode: "card", size: { width: 350, height: 76 }, reused: false, warnings: [expect.stringMatching(/card mode/)] });
    const reshaped = await http.post("/api/canvas/file-node").send({ assetPath: "说明.pdf", width: 100, height: 900 });
    expect(reshaped.body).toMatchObject({ nodeId: card.body.nodeId, reused: true, viewMode: "preview", size: { width: 320, height: 900 } });
    expect(events.at(-1)).toMatchObject({ type: "canvas_updated", updatedNodes: [{ id: card.body.nodeId, data: { viewMode: "preview" } }] });

    await enroll("页面.html", "<h1>hi</h1>");
    expect((await http.post("/api/canvas/file-node").send({ assetPath: "页面.html" })).body).toMatchObject({ viewMode: "preview", size: { width: 820, height: 480 } });
    expect((await http.post("/api/canvas/file-node").send({ assetPath: "源图.png" })).status).toBe(400);
    expect((await http.post("/api/canvas/file-node").send({ assetPath: "没有.pdf" })).status).toBe(404);
  });

  it("plugin-data：只认挂着 pluginId 的文件节点；写入去重、删键、限额", async () => {
    const plain = await http.post("/api/canvas/plugin-data").send({ nodeId: imageNode, key: "k", value: 1 });
    expect(plain.status).toBe(400);
    expect(plain.body.message).toMatch(/not an installed HTML-plugin node/);

    const row = await enroll("插件.html", "<div/>");
    const c = await canvas();
    c.nodes.push({ id: "plugin-1", type: "file", assetId: row.id, positions: { workflow: { x: 0, y: 900 } }, data: { pluginId: "todo" } });
    expect((await http.post("/api/canvas").send(c)).status).toBeLessThan(300);

    const w = await http.post("/api/canvas/plugin-data").send({ nodeId: "plugin-1", key: "list", value: ["买菜"] });
    expect(w.body).toEqual({ nodeId: "plugin-1", key: "list", keys: ["list"], totalBytes: 10 });
    expect(events.filter((e) => e.type === "plugin_storage_changed")).toEqual([{ type: "plugin_storage_changed", nodeId: "plugin-1" }]);
    await http.post("/api/canvas/plugin-data").send({ nodeId: "plugin-1", key: "list", value: ["买菜"] });
    expect(events.filter((e) => e.type === "plugin_storage_changed")).toHaveLength(1);

    expect((await http.post("/api/canvas/plugin-data/read").send({ nodeId: "plugin-1", key: "list" })).body).toEqual({ nodeId: "plugin-1", keys: ["list"], value: ["买菜"] });
    expect((await http.post("/api/canvas/plugin-data/read").send({ nodeId: "plugin-1" })).body).toEqual({ nodeId: "plugin-1", keys: ["list"] });

    const big = "x".repeat(300 * 1024);
    expect((await http.post("/api/canvas/plugin-data").send({ nodeId: "plugin-1", key: "big", value: big })).status).toBe(400);
    expect((await http.post("/api/canvas/plugin-data").send({ nodeId: "plugin-1", key: "list", deleteKey: true })).body.keys).toEqual([]);
  });

  it("revert-edits：逐条独立，定位逐级放宽；一条都没撤成回 conflict 且不写盘", async () => {
    const t = await http.post("/api/canvas/text-node").send({ content: "第一场：夜晚，街上下着雨。第二场：清晨。", name: "剧本" });
    const detail = (await http.post("/api/canvas/nodes/detail").send({ nodeIds: [t.body.nodeId] })).body.nodes[0];
    const applied = await http.post("/api/canvas/text-node/apply-edits").send({
      nodeId: t.body.nodeId,
      expectedContentHash: detail.textContentHash,
      edits: [{ annotationId: "a1", exact: "夜晚", replacement: "黄昏" }],
    });
    expect(applied.body.status).toBe("applied");
    const [ae] = applied.body.appliedEdits;

    // 前文后来被改过（"第一场" → "第1场"），只对后文还能撤。
    writeFileSync(path.join(ws, "剧本.md"), "第1场：黄昏，街上下着雨。第二场：清晨。");
    const r = await http.post("/api/canvas/text-node/revert-edits").send({
      nodeId: t.body.nodeId,
      edits: [
        { annotationId: "a1", exact: ae.replacement, prefix: ae.reversePrefix, suffix: ae.reverseSuffix, replacement: ae.originalText },
        { annotationId: "gone", exact: "不存在的字", replacement: "x" },
      ],
    });
    expect(r.body).toMatchObject({
      status: "applied",
      content: "第1场：夜晚，街上下着雨。第二场：清晨。",
      results: [
        { annotationId: "a1", status: "applied" },
        { annotationId: "gone", status: "conflict", reason: "not_found" },
      ],
    });
    expect(readFileSync(path.join(ws, "剧本.md"), "utf8")).toBe(r.body.content);
    expect(events.some((e) => e.type === "canvas_updated" && e.origin === "mcp-write")).toBe(true);

    events.length = 0;
    const none = await http.post("/api/canvas/text-node/revert-edits").send({ nodeId: t.body.nodeId, edits: [{ annotationId: "x", exact: "黄昏", replacement: "夜晚" }] });
    expect(none.body.status).toBe("conflict");
    expect(events).toEqual([]);
  });

  it("placeholder-group：每格一张占位卡，order 按顺序，两张以上成组，只发一帧", async () => {
    const r = await http.post("/api/canvas/placeholder-group").send({
      sourceNodeId: imageNode,
      label: "三个机位",
      cells: [
        { prompt: "正面", model: "qwen-image-pro", aspectRatio: "16:9" },
        { prompt: "侧面", model: "qwen-image-pro" },
        { prompt: "俯视", model: "qwen-image-pro" },
      ],
    });
    expect(r.status).toBe(201);
    expect(r.body.placeholderIds).toHaveLength(3);
    expect(r.body.groupId).toMatch(/^group-/);
    const frames = events.filter((e) => e.type === "canvas_updated");
    expect(frames).toHaveLength(1);
    expect(frames[0].addedNodes[0]).toMatchObject({ id: r.body.groupId, type: "group", data: { label: "三个机位" } });
    expect(frames[0].updatedNodes).toBeUndefined();
    const c = await canvas();
    const cards = r.body.placeholderIds.map((id: string) => c.nodes.find((n: any) => n.id === id));
    expect(cards.map((n: any) => n.data.params.order)).toEqual(["0", "1", "2"]);
    expect(cards.every((n: any) => n.parentId === r.body.groupId && n.data.status === "generating")).toBe(true);
    expect(cards[0].data.aspectRatio).toBe("16:9");
    expect(cards[1].data.aspectRatio).toBe("1:1");
    expect(r.body.placeholderIds.every((id: string) => c.edges.some((e: any) => e.id === `${imageNode}->${id}`))).toBe(true);

    const single = await http.post("/api/canvas/placeholder-group").send({ sourceNodeId: imageNode, cells: [{ prompt: "只有一张", model: "m" }] });
    expect(single.body.groupId).toBeNull();
    const missing = await http.post("/api/canvas/placeholder-group").send({ sourceNodeId: "nope", cells: [{ prompt: "p", model: "m" }] });
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ code: "PLACEHOLDER_SOURCE_NOT_FOUND", sourceNodeId: "nope" });
  });

  it("nodes-group：每个资产新建节点（不复用），找不到的丢掉，全找不到回空", async () => {
    const a = await enroll("镜头A.png", PNG, { prompt: "镜头 A", model: "qwen-image-pro" });
    const b = await enroll("镜头B.png", PNG);
    const r = await http.post("/api/canvas/nodes-group").send({ sourceNodeId: imageNode, assetIds: [a.id, "ghost", b.id], layout: "vertical" });
    expect(r.body.nodeIds).toHaveLength(2);
    expect(r.body.groupId).toMatch(/^group-/);
    const c = await canvas();
    const first = c.nodes.find((n: any) => n.id === r.body.nodeIds[0]);
    expect(first).toMatchObject({ type: "image", assetId: a.id, parentId: r.body.groupId, data: { name: "镜头A.png", path: "镜头A.png", params: { order: "0" }, prompt: "镜头 A", model: "qwen-image-pro" } });
    expect((await http.post("/api/canvas/nodes-group").send({ sourceNodeId: imageNode, assetIds: ["ghost"] })).body).toEqual({ nodeIds: [], groupId: null });
  });

  it("split-sub-images：成员排到主图右边、去掉组标记、补提示词、连边；参数不对 400（200 状态码）", async () => {
    const c = await canvas();
    const main = c.nodes.find((n: any) => n.id === imageNode);
    main.groupId = "g1";
    main.data = { ...(main.data ?? {}), prompt: "四宫格", model: "qwen-image-pro" };
    const sub = await enroll("子图.png", PNG);
    c.nodes.push({ id: "sub-1", type: "image", assetId: sub.id, groupId: "g1", round: 1, positions: { workflow: { x: 0, y: 0 } }, meta: { hidden: true } });
    expect((await http.post("/api/canvas").send(c)).status).toBeLessThan(300);

    const r = await http.post("/api/canvas/split-sub-images").send({ nodeId: imageNode, imageIds: [sub.id] });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ splitNodeIds: ["sub-1"], removed: 1 });
    const after = (await canvas()).nodes.find((n: any) => n.id === "sub-1");
    const mp = main.positions.workflow;
    expect(after.positions.workflow).toEqual({ x: mp.x + 350 + 24, y: mp.y });
    expect(after.groupId).toBeUndefined();
    expect(after.meta.hidden).toBe(false);
    expect(after.data).toMatchObject({ prompt: "四宫格", model: "qwen-image-pro" });
    expect(events.find((e) => e.type === "canvas_updated" && e.origin === "user-add")?.addedEdges?.[0]).toMatchObject({ source: imageNode, target: "sub-1" });

    expect((await http.post("/api/canvas/split-sub-images").send({ nodeId: imageNode, imageIds: ["nobody"] })).body).toEqual({ splitNodeIds: [], removed: 0 });
    const bad = await http.post("/api/canvas/split-sub-images").send({ nodeId: imageNode, imageIds: [] });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe("nodeId and non-empty imageIds[] are required");
  });
});
