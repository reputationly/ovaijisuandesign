import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { MediaConfigService } from "./media-config.service.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);
// 只需要 ftyp 头让扩展名嗅成 .mp4；不是能播的视频。
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(12)]);

/** 假平台：出图同步回 URL；视频提交回任务号，查两次后完成。 */
function fakePlatform() {
  const calls: { method: string; url: string; body?: any }[] = [];
  const polls = new Map<string, number>();
  let base = "";
  let nextVideoStatus: "completed" | "failed" = "completed";
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      calls.push({ method: req.method!, url: req.url!, body: raw ? JSON.parse(raw) : undefined });
      const json = (v: unknown) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(v));
      };
      if (req.url === "/v1/images/generations") return json({ data: [{ url: `${base}/files/out.png` }] });
      if (req.url === "/v1/videos" && req.method === "POST") return json({ task_id: `vt-${calls.length}` });
      const m = /^\/v1\/videos\/(.+)$/.exec(req.url!);
      if (m) {
        const n = (polls.get(m[1]!) ?? 0) + 1;
        polls.set(m[1]!, n);
        if (n < 2) return json({ status: "in_progress" });
        if (nextVideoStatus === "failed") return json({ status: "failed", error: { message: "内容不合规" } });
        return json({ status: "completed", metadata: { url: `${base}/files/clip` } });
      }
      if (req.url === "/files/out.png") {
        res.setHeader("content-type", "image/png");
        return res.end(PNG);
      }
      if (req.url === "/files/clip") {
        res.setHeader("content-type", "application/octet-stream");
        return res.end(MP4);
      }
      res.statusCode = 404;
      res.end();
    });
  });
  return {
    server,
    calls,
    setBase: (b: string) => (base = b),
    failVideos: () => (nextVideoStatus = "failed"),
    succeedVideos: () => (nextVideoStatus = "completed"),
  };
}

async function until<T>(fn: () => Promise<T | undefined>, ms = 5000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v !== undefined) return v;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe("生成（假平台）", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let platform: ReturnType<typeof fakePlatform>;
  let server: Server;
  const events: any[] = [];

  async function boot() {
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m.payload));
  }

  async function settle(taskId: string) {
    return until(async () => {
      const r = await http.get(`/api/generate/tasks/${taskId}/query`);
      return r.body.status === "processing" ? undefined : r.body;
    });
  }

  beforeAll(async () => {
    platform = fakePlatform();
    server = platform.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    platform.setBase(base);
    ws = mkdtempSync(path.join(tmpdir(), "ov-generate-e2e-"));
    const cfg = path.join(ws, "config.json");
    writeFileSync(
      cfg,
      JSON.stringify({
        platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" },
        models: { image: "qwen-image", video: "minimax-h3-fl2va", speech: "indextts-2.5", voice_map: { narrator: "https://x/ref.wav" } },
      }),
    );
    process.env.WORKSPACE_DIR = ws;
    process.env.OV_CONFIG_PATH = cfg;
    // 音色表是应用级的，不指过来就会读到本机真实的 ~/.ovhub。
    process.env.HILO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ov-generate-e2e-hub-"));
    await boot();
  });
  afterAll(async () => {
    await app.close();
    await new Promise((r) => server.close(r));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
    delete process.env.HILO_DATA_DIR;
  });

  it("模型目录来自本机配置，音色来自 voice_map", async () => {
    const c = (await http.get("/api/models?agent_version=2")).body;
    expect(c.imageModels.map((m: any) => m.id)).toEqual(["qwen-image"]);
    expect(c.videoModels[0]).toMatchObject({ id: "minimax-h3-fl2va", backend: "minimax_v3", model_name: "MiniMax-H3", display_name: "minimax-h3-fl2va", type: "video", tool_names: ["hub_generate_video"] });
    expect(c.audioModels.map((m: any) => m.id)).toEqual(["indextts-2.5"]);
    expect(c.defaultTextModelId).toBe("chat");
    expect((await http.get("/api/speech/voices?page_size=1000")).body).toEqual([
      expect.objectContaining({ voice_id: "narrator", sample_audio: "https://x/ref.wav" }),
    ]);
    expect((await http.get("/api/v1/models/concurrency/limits")).body).toEqual({ items: [] });
  });

  let imageNode = "";
  it("出图：先出占位卡，完成后原地换成图片节点，结果带 node_id", async () => {
    const sub = await http
      .post("/api/generate/image/submit")
      .set("x-session-id", "ses_1")
      .send({ backend: "nano_banana", model_id: "nano-banana-pro", prompt: "一只白猫", image_paths: [], filename: "白猫", params: { aspect_ratio: "1:1", order: "2" }, source_tool: "hub_generate_image:banana" });
    expect(sub.body).toMatchObject({ ok: true, status: "processing", media_type: "image" });
    const placeholder = events.find((e) => e.type === "canvas_updated" && e.addedNodes?.[0]?.type === "placeholder")?.addedNodes[0];
    expect(placeholder.data).toMatchObject({ status: "generating", prompt: "一只白猫", model: "qwen-image", mediaType: "image", aspectRatio: "1:1" });

    const done = await settle(sub.body.task_id);
    expect(done).toMatchObject({ ok: true, status: "succeeded", result: { ok: true, path: "白猫.png", width: 1, height: 1, node_id: placeholder.id } });
    imageNode = placeholder.id;

    const canvas = (await http.get("/api/canvas")).body;
    const node = canvas.nodes.find((n: any) => n.id === placeholder.id);
    expect(node.type).toBe("image");
    expect(node.data).toMatchObject({ prompt: "一只白猫", model: "qwen-image", params: { order: "2" } });
    expect(node.data.status).toBeUndefined();
    const asset = (await http.get("/api/assets?include=metadata")).body.assets.find((a: any) => a.path === "白猫.png");
    expect(asset.metadata).toMatchObject({ session_id: "ses_1", source_tool: "hub_generate_image:banana", gateway_task_id: sub.body.task_id });
    expect(JSON.parse(readFileSync(path.join(ws, ".hilo/active-generations.json"), "utf8")).records).toEqual([]);
    // 平台收到的是我们配的模型，不是调用方点名的外部模型。
    expect(platform.calls.find((c) => c.url === "/v1/images/generations")!.body.model).toBe("qwen-image");
  });

  it("同名文件不覆盖：第二张落成 白猫_1.png", async () => {
    const sub = await http.post("/api/generate/image/submit").send({ prompt: "又一只", filename: "白猫.png" });
    expect((await settle(sub.body.task_id)).result.path).toBe("白猫_1.png");
  });

  it("登记失败时删掉刚下载的文件，不留孤儿", async () => {
    const assets = app.get(AssetsService);
    const orig = assets.enroll.bind(assets);
    assets.enroll = async () => {
      throw new Error("sqlite 打不开");
    };
    try {
      const sub = await http.post("/api/generate/image/submit").send({ prompt: "孤儿", filename: "孤儿" });
      const done = await settle(sub.body.task_id);
      expect(done).toMatchObject({ status: "failed", error: "sqlite 打不开" });
      expect(existsSync(path.join(ws, "孤儿.png"))).toBe(false);
    } finally {
      assets.enroll = orig;
    }
  });

  it("视频：首帧来自画布上的图，派生边连到结果", async () => {
    const sub = await http
      .post("/api/generate/video/submit")
      .send({ backend: "minimax_v3", prompt: "猫跳起来", image_paths: ["白猫.png"], params: { duration: "5" }, source_node_id: imageNode, source_tool: "hub_generate_video:MiniMax:i2v" });
    const done = await settle(sub.body.task_id);
    expect(done.result.path).toMatch(/\.mp4$/);
    const submitted = platform.calls.filter((c) => c.url === "/v1/videos" && c.method === "POST").at(-1)!.body;
    expect(submitted.metadata.task_type).toBe("i2v");
    const canvas = (await http.get("/api/canvas")).body;
    expect(canvas.edges.some((e: any) => e.source === imageNode && e.target === done.result.node_id)).toBe(true);
  });

  it("参考生视频 / 首尾帧：不传 source_node_id，光靠路径也要连出派生边", async () => {
    // **这条路上 `source_node_id` 永远是空的。** agent（MCP）提交的是 `image_paths` /
    // `params.reference_images` 这些**路径**，不是节点 id。建边只能照路径反查资产再反查节点。
    //
    // 以前这里什么都不填，占位卡和结果节点都没有边 —— 参考图和视频在画布上看起来毫无关系，
    // 而平台明明是照着那张参考图生成的。
    //
    // 两种请求体都照 MCP `buildVideoBody` 的真实形状写：参考图走
    // `params.image_mode="reference"` + JSON 化的 `params.reference_images`（`image_paths` 是空的），
    // 首尾帧走 `image_paths` 的两个槽位。写错形状的话测的是网关的容错，不是客户端的真请求。
    const second = await http.post("/api/generate/image/submit").send({ backend: "nano_banana", prompt: "一只黑猫", filename: "黑猫" });
    const secondNode = (await settle(second.body.task_id)).result.node_id as string;
    const both = [imageNode, secondNode].sort();
    const sourcesInto = async (target: string) =>
      ((await http.get("/api/canvas")).body.edges as any[]).filter((e) => e.target === target).map((e) => e.source).sort();

    // 参考生视频。
    const ref = await http.post("/api/generate/video/submit").send({
      backend: "minimax_v3",
      prompt: "照着参考图动起来",
      image_paths: [],
      params: { image_mode: "reference", reference_images: JSON.stringify(["白猫.png", "黑猫.png"]) },
      source_tool: "hub_generate_video:MiniMax:multimodal",
    });
    const refNode = (await settle(ref.body.task_id)).result.node_id as string;
    expect(await sourcesInto(refNode)).toEqual(both);

    // 首尾帧：两个槽位分别落到两张图上。
    const flf = await http.post("/api/generate/video/submit").send({
      backend: "minimax_v3",
      prompt: "从白猫到黑猫",
      image_paths: ["白猫.png", "黑猫.png"],
      params: { image_mode: "first-last-frame" },
      source_tool: "hub_generate_video:MiniMax:first-last-frame",
    });
    const flfNode = (await settle(flf.body.task_id)).result.node_id as string;
    expect(await sourcesInto(flfNode)).toEqual(both);
  });

  it("平台终态失败：占位卡标错误，查询回 cloud_terminal", async () => {
    platform.failVideos();
    const sub = await http.post("/api/generate/video/submit").send({ prompt: "不合规的内容" });
    const done = await settle(sub.body.task_id);
    expect(done).toMatchObject({ ok: false, status: "failed", cloud_terminal: true, error_code: "backend_error" });
    const canvas = (await http.get("/api/canvas")).body;
    const card = canvas.nodes.find((n: any) => n.type === "placeholder" && n.data.prompt === "不合规的内容");
    expect(card.data.status).toBe("error");
    expect(card.data.retryPayload).toMatchObject({ mediaType: "video" });
  });

  it("同步出图：请求挂到结果出来，回结果本身（201），账上不留", async () => {
    const r = await http.post("/api/generate/image").send({ backend: "nano_banana", prompt: "同步的猫", filename: "同步" });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, path: "同步.png", width: 1, height: 1, node_id: expect.any(String) });
    expect(JSON.parse(readFileSync(path.join(ws, ".hilo/active-generations.json"), "utf8")).records).toEqual([]);
  });

  it("同步视频：平台失败时回 {ok:false, error, error_code}，占位卡已经是错误态", async () => {
    platform.failVideos();
    const r = await http.post("/api/generate/video").send({ backend: "minimax_v3", prompt: "同步失败", filename: "失败" });
    expect(r.body).toEqual({ ok: false, error: "内容不合规", error_code: "backend_error", user_message: "内容不合规" });
    const card = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.data?.prompt === "同步失败");
    expect(card.data.status).toBe("error");
    platform.succeedVideos();
  });

  it("同步路由按参照的 DTO 校验：backend / filename 必填、图片和音频要 prompt、多余字段 400", async () => {
    const post = (p: string, b: object) => http.post(p).send(b);
    expect((await post("/api/generate/image", { prompt: "x", filename: "x" })).status).toBe(400);
    expect((await post("/api/generate/image", { backend: "b", prompt: "x" })).status).toBe(400);
    expect((await post("/api/generate/image", { backend: "b", filename: "x" })).status).toBe(400);
    expect((await post("/api/generate/image", { backend: "b", prompt: "x", filename: "x", mode: "i2i" })).status).toBe(400);
    expect((await post("/api/generate/image", { backend: "b", prompt: "x", filename: "x", count: 10 })).status).toBe(400);
    expect((await post("/api/generate/speech", { backend: "b", filename: "x" })).status).toBe(400);
    expect((await post("/api/generate/video", { backend: "b", filename: "x", first_frame_image: "a.png" })).status).toBe(400);
  });

  it("异步路由：201；多张 / new_round 回 409 让调用方改走同步；画布来源不记 session", async () => {
    const batch = await http.post("/api/generate/image/submit").send({ prompt: "多张", count: 2 });
    expect(batch.status).toBe(409);
    expect(batch.body).toEqual({ ok: false, error: "batch (count>1) is not supported by async endpoint", error_code: "BATCH_NOT_SUPPORTED_USE_SYNC" });
    const round = await http.post("/api/generate/video/submit").send({ prompt: "新一轮", new_round: true });
    expect(round.status).toBe(409);
    expect(round.body.error_code).toBe("VIDEO_NEW_ROUND_NOT_SUPPORTED_USE_SYNC");

    const sub = await http.post("/api/generate/image/submit").set({ "x-hilo-source": "canvas", "x-session-id": "ses_canvas" }).send({ prompt: "画布出图", filename: "画布出图", session_id: "ses_body" });
    expect(sub.status).toBe(201);
    await settle(sub.body.task_id);
    const asset = (await http.get("/api/assets?include=metadata")).body.assets.find((a: any) => a.path === "画布出图.png");
    expect(asset.metadata.session_id).toBeUndefined();
  });

  it("metrics：只有汇总数字，形状和参照一致", async () => {
    const m = (await http.get("/api/generate/metrics")).body;
    expect(m).toMatchObject({
      async_submit_succeeded: expect.any(Number),
      completed_cache_hit: expect.any(Number),
      legacy_sync_endpoint_hit: { image: expect.any(Number), video: expect.any(Number), speech: 0, music: 0, other: 0 },
      active_generation_records: { total: 0, by_phase: { cloud_pending: 0 }, by_disposition: { none: 0 } },
    });
    expect(m.legacy_sync_endpoint_hit.image).toBeGreaterThan(0);
  });

  it("没配的能力提交时就拒绝（4xx），不建占位卡", async () => {
    const before = (await http.get("/api/canvas")).body.nodes.length;
    const r = await http.post("/api/generate/music/submit").send({ prompt: "钢琴" });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error_code: "MODEL_NOT_CONFIGURED" });
    expect((await http.get("/api/canvas")).body.nodes.length).toBe(before);
  });

  it("未知任务 404 TASK_NOT_FOUND", async () => {
    const r = await http.get("/api/generate/tasks/gen_nope/query");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({
      ok: false,
      task_id: "gen_nope",
      error: "task_id not found",
      error_code: "TASK_NOT_FOUND",
      user_message: "上游生成任务未找到，可能已过期或被清理，请重新生成。",
    });
  });

  it("重启恢复：账上有平台任务号的接着等完；没有任务号的标成需要用户处理", async () => {
    await app.close();
    const ledger = path.join(ws, ".hilo/active-generations.json");
    const canvasFile = JSON.parse(readFileSync(path.join(ws, ".hilo/canvas.json"), "utf8"));
    const mk = (id: string) => ({ id, type: "placeholder", positions: { workflow: { x: 0, y: 0 } }, size: { width: 350, height: 350 }, data: { status: "generating", prompt: id, mediaType: "video" } });
    canvasFile.nodes.push(mk("ph-resume"), mk("ph-lost"));
    writeFileSync(path.join(ws, ".hilo/canvas.json"), JSON.stringify(canvasFile));
    const rec = (id: string, extra: object) => ({ id, taskId: `gen_${id}`, mediaType: "video", backend: "maas", request: { prompt: id }, placeholderId: `ph-${id}`, generationAttemptId: "a", createdAt: 0, ...extra });
    writeFileSync(ledger, JSON.stringify({ version: 1, records: [rec("resume", { platformTaskId: "vt-old" }), rec("lost", {})] }));
    platform.calls.length = 0;
    platform.succeedVideos();
    await boot();

    const done = await settle("gen_resume");
    expect(done.status).toBe("succeeded");
    expect(platform.calls.some((c) => c.method === "POST" && c.url === "/v1/videos")).toBe(false);
    expect(platform.calls.some((c) => c.url === "/v1/videos/vt-old")).toBe(true);
    const lost = await settle("gen_lost");
    expect(lost.status).toBe("failed");
    const canvas = (await http.get("/api/canvas")).body;
    expect(canvas.nodes.find((n: any) => n.id === "ph-resume").type).toBe("video");
    expect(canvas.nodes.find((n: any) => n.id === "ph-lost").data.status).toBe("recoverable_error");
    expect(JSON.parse(readFileSync(ledger, "utf8")).records).toEqual([]);
  });
});
