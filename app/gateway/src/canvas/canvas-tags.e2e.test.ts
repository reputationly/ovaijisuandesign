import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

// 身份校验以 claim 为开关：不设 claim 的 gateway 不校验身份，测不出剥参数的效果。
const IDENTITY = { claim: "c".repeat(64), instance: "inst-1", generation: "3" };
const HEADERS = { "x-hilo-workspace": IDENTITY.claim, "x-hilo-workspace-instance": IDENTITY.instance, "x-hilo-workspace-generation": IDENTITY.generation };

describe("画布标签 + query 里的公共参数 / 身份参数", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let root = "";
  const events: any[] = [];
  let a1 = "";
  let a2 = "";

  beforeAll(async () => {
    root = mkdtempSync(path.join(tmpdir(), "ov-canvas-tags-e2e-"));
    process.env.WORKSPACE_DIR = path.join(root, "ws");
    mkdirSync(process.env.WORKSPACE_DIR);
    process.env.HILO_DATA_DIR = path.join(root, "hub");
    // 旧版全局标签文件：第一次读标签表时迁进工作区。
    mkdirSync(path.join(root, "hub", "canvas"), { recursive: true });
    writeFileSync(
      path.join(root, "hub", "canvas", "tag-registry.json"),
      JSON.stringify({ colors: [{ id: "color:red", name: "主角" }], transparents: [{ id: "kw-old", name: "旧关键词" }] }),
    );
    process.env.HILO_WORKSPACE_CLAIM = IDENTITY.claim;
    process.env.HILO_WORKSPACE_INSTANCE_ID = IDENTITY.instance;
    process.env.HILO_WORKSPACE_GENERATION = IDENTITY.generation;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m.payload));
    await http.post("/api/upload").set(HEADERS).attach("file", PNG, "a.png");
    await http.post("/api/upload").set(HEADERS).attach("file", PNG, "b.png");
    const assets = (await http.get("/api/assets").set(HEADERS)).body.assets as { id: string; path: string }[];
    a1 = assets.find((a) => a.path === "a.png")!.id;
    a2 = assets.find((a) => a.path === "b.png")!.id;
  });
  afterAll(async () => {
    await app.close();
    for (const k of ["WORKSPACE_DIR", "HILO_DATA_DIR", "HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION"]) delete process.env[k];
    rmSync(root, { recursive: true, force: true });
  });

  it("用 DTO 收 query 的路由：公共参数和身份参数都被剥掉，不再 400", async () => {
    const q = `type=file&limit=100&hilo_workspace=${IDENTITY.claim}&hilo_workspace_instance=${IDENTITY.instance}&hilo_workspace_generation=${IDENTITY.generation}&device_platform=desktop&app_id=3001&unix=1`;
    const r = await http.get(`/api/canvas/nodes?${q}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ count: 0, nodes: [] });
    // 身份对不上照样 409：剥参数发生在校验之后。
    expect((await http.get(`/api/canvas/nodes?hilo_workspace=${IDENTITY.claim}&hilo_workspace_instance=someone-else`)).status).toBe(409);
    // 没带 desktop 标记的请求里，同名参数不剥（可能是真参数），DTO 照常拒掉。
    expect((await http.get("/api/canvas/nodes?app_id=3001").set(HEADERS)).status).toBe(400);
  });

  let revision = 0;
  it("第一次读：从旧文件迁移（改过名的颜色 + 关键词），7 个颜色标签补齐", async () => {
    const r = await http.get("/api/canvas/tag-registry?device_platform=desktop&app_id=3001").set(HEADERS);
    expect(r.status).toBe(200);
    const reg = r.body.registry;
    expect(reg).toMatchObject({ version: 2, revision: 0, orderMode: "default" });
    expect(reg.tags.filter((t: any) => t.kind === "color")).toHaveLength(7);
    expect(reg.tags.find((t: any) => t.id === "color:red")).toMatchObject({ kind: "color", color: "#FF5F57", name: "主角" });
    expect(reg.tags.at(-1)).toMatchObject({ id: "kw-old", kind: "keyword", name: "旧关键词" });
    // 默认顺序跟色板走：蓝色在最前。
    expect(reg.tags[0].id).toBe("color:blue");
    revision = reg.revision;
  });

  let kw = "";
  it("新建关键词：revision +1，广播标签表；重名 / 过长 / 旧 revision 被拒", async () => {
    const r = await http.post("/api/canvas/tags").set(HEADERS).send({ name: "反派", kind: "keyword", revision });
    expect(r.status).toBe(201);
    expect(r.body.tag).toMatchObject({ kind: "keyword", name: "反派" });
    expect(r.body.registry.revision).toBe(revision + 1);
    kw = r.body.tag.id;
    expect(events.some((e) => e.type === "canvas_tag_registry_changed" && e.registry.revision === revision + 1)).toBe(true);
    revision += 1;

    let bad = await http.post("/api/canvas/tags").set(HEADERS).send({ name: "反派", kind: "keyword", revision });
    expect(bad.status).toBe(409);
    expect(bad.body.code).toBe("CANVAS_TAG_DUPLICATE_NAME");
    // 预置颜色没改名时的默认名也算重名。
    bad = await http.post("/api/canvas/tags").set(HEADERS).send({ name: "场景", kind: "keyword", revision });
    expect(bad.body.code).toBe("CANVAS_TAG_DUPLICATE_NAME");
    bad = await http.post("/api/canvas/tags").set(HEADERS).send({ name: "一二三四五六七", kind: "keyword", revision });
    expect(bad.status).toBe(400);
    bad = await http.post("/api/canvas/tags").set(HEADERS).send({ name: "新的", kind: "keyword", revision: 0 });
    expect(bad.status).toBe(409);
    expect(bad.body).toMatchObject({ code: "CANVAS_TAG_REVISION_CONFLICT", revision });
    bad = await http.post("/api/canvas/tags").set(HEADERS).send({ name: "颜色", kind: "color", revision });
    expect(bad.status).toBe(400);
  });

  it("改名、改色；关键词不能改色", async () => {
    let r = await http.patch("/api/canvas/tags/color:green").set(HEADERS).send({ name: "定稿", revision });
    expect(r.body.tag).toMatchObject({ id: "color:green", name: "定稿", color: "#30D158" });
    expect(r.body.tag.legacyNameKey).toBeUndefined();
    revision += 1;
    r = await http.patch(`/api/canvas/tags/${kw}`).set(HEADERS).send({ color: "#FF5F57", revision });
    expect(r.status).toBe(400);
    r = await http.patch("/api/canvas/tags/color:green").set(HEADERS).send({ color: "#123456", revision });
    expect(r.status).toBe(400);
    expect((await http.patch("/api/canvas/tags/nope").set(HEADERS).send({ name: "x", revision })).status).toBe(404);
  });

  it("素材打标签：整组替换、批量、单个加减；颜色标签每个素材只能一个", async () => {
    let r = await http.patch(`/api/assets/${a1}/tags`).set(HEADERS).send({ tagIds: ["color:red", kw] });
    expect(r.body).toEqual({ ok: true, tagIds: ["color:red", kw] });
    r = await http.patch(`/api/assets/${a1}/tags`).set(HEADERS).send({ tagIds: ["color:red", "color:blue"] });
    expect(r.status).toBe(400);
    r = await http.patch(`/api/assets/${a1}/tags`).set(HEADERS).send({ tagIds: ["nope"] });
    expect(r.status).toBe(400);
    r = await http.patch("/api/assets/nope/tags").set(HEADERS).send({ tagIds: [] });
    expect(r.status).toBe(404);

    r = await http.patch("/api/assets/tags/batch").set(HEADERS).send({ assignments: [{ assetId: a2, tagIds: [kw] }] });
    expect(r.body).toEqual({ ok: true, updatedAssets: [{ id: a2, tagIds: [kw] }] });

    // 加颜色标签顶掉原来的颜色，并排到最前。
    r = await http
      .patch("/api/assets/tags/mutations/batch")
      .set(HEADERS)
      .send({ assetIds: [a1, a2], tagId: "color:blue", operation: "assign" });
    expect(r.body.updatedAssets).toEqual([
      { id: a1, tagIds: ["color:blue", kw] },
      { id: a2, tagIds: ["color:blue", kw] },
    ]);
    const batch = events.filter((e) => e.type === "assets_changed_batch").at(-1);
    expect(batch.events.map((e: any) => e.id).sort()).toEqual([a1, a2].sort());
    r = await http.patch("/api/assets/tags/mutations/batch").set(HEADERS).send({ assetIds: [a2], tagId: "color:blue", operation: "remove" });
    expect(r.body.updatedAssets).toEqual([{ id: a2, tagIds: [kw] }]);
    // 标签落在素材 metadata 里，资产列表带 metadata 时能看到。
    const assets = (await http.get("/api/assets?include=metadata").set(HEADERS)).body.assets;
    expect(assets.find((a: any) => a.id === a1).metadata.tagIds).toEqual(["color:blue", kw]);
  });

  it("重排：必须恰好是全部标签；之后是自定义顺序", async () => {
    const reg = (await http.get("/api/canvas/tag-registry").set(HEADERS)).body.registry;
    const ids = reg.tags.map((t: any) => t.id).reverse();
    expect((await http.put("/api/canvas/tags/order").set(HEADERS).send({ tagIds: ids.slice(1), revision })).status).toBe(400);
    const r = await http.put("/api/canvas/tags/order").set(HEADERS).send({ tagIds: ids, revision });
    expect(r.status).toBe(200);
    expect(r.body.registry).toMatchObject({ orderMode: "custom", revision: revision + 1 });
    expect(r.body.registry.tags.map((t: any) => t.id)).toEqual(ids);
    revision += 1;
  });

  it("删除关键词：影响统计、从素材上摘掉；颜色标签不能删", async () => {
    expect((await http.get(`/api/canvas/tags/${encodeURIComponent(kw)}/impact`).set(HEADERS)).body).toEqual({ tagId: kw, assetCount: 2, nodeCount: 0 });
    expect((await http.delete("/api/canvas/tags/color:red").set(HEADERS).send({ revision })).status).toBe(400);
    const r = await http.delete(`/api/canvas/tags/${encodeURIComponent(kw)}`).set(HEADERS).send({ revision });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, tagId: kw, assetCount: 2, nodeCount: 0 });
    expect(r.body.registry.tags.some((t: any) => t.id === kw)).toBe(false);
    expect(r.body.updatedAssets).toEqual(expect.arrayContaining([{ id: a1, tagIds: ["color:blue"] }, { id: a2, tagIds: [] }]));
    expect((await http.get(`/api/canvas/tags/${encodeURIComponent(kw)}/impact`).set(HEADERS)).status).toBe(404);
  });
});
