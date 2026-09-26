import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

describe("plan / feedback-extractor 通知", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const events: any[] = [];

  beforeAll(async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-plan-e2e-"));
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("notify-changed：广播 plan_changed，只带认识的字段", async () => {
    const r = await http
      .post("/api/plan/notify-changed")
      .send({ plan_id: " plan-1 ", revision: 3, action: "patch_stage", stage_ids: ["s1", 2, "s2"], runtime_session_id: "ses", extra: true });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(events.at(-1)).toEqual({
      event: "plan:changed",
      payload: { type: "plan_changed", plan_id: "plan-1", revision: 3, action: "patch_stage", stage_ids: ["s1", "s2"], runtime_session_id: "ses" },
    });
  });

  it("notify-changed：字段不齐或 action 不认识时静默回 ok，不广播", async () => {
    const n = events.length;
    for (const body of [{}, { plan_id: "p", revision: "3", action: "write" }, { plan_id: "p", revision: 1, action: "delete" }]) {
      const r = await http.post("/api/plan/notify-changed").send(body);
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ ok: true });
    }
    expect(events.length).toBe(n);
  });

  it("feedback-extractor：notify-manual-write 回 ok；config 回显开关", async () => {
    const r = await http.post("/api/feedback-extractor/notify-manual-write").send({ sessionId: "ses" });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect((await http.post("/api/feedback-extractor/notify-manual-write").send({})).body).toEqual({ ok: true });
    expect((await http.post("/api/feedback-extractor/config").send({ enabled: 1 })).body).toEqual({ ok: true, enabled: true });
  });
});

describe("plan 审阅视图与审阅阶段改工作项", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const events: any[] = [];

  const plan = () => ({
    schema_version: 1,
    revision: 3,
    title: "短片计划",
    sources: [{ id: "src-1", name: "剧本", path: "script.md" }],
    stage_outline: [
      { id: "s1", order: 1, name: "分镜" },
      { id: "s2", order: 2, name: "出图" },
      { id: "s3", order: 3, name: "剪辑" },
    ],
    stages: [
      { id: "s1", order: 1, goal: "写分镜", contract: { work_items: [{ id: "shot-1", prompt: "开场" }] }, runtime: { status: "done", runtime_refs: [{ id: "shot-1", path: "a.md" }] } },
      {
        id: "s2",
        order: 2,
        goal: "按分镜出图",
        contract: {
          depends_on: ["s1"],
          review: { before_execution: ["确认提示词"] },
          work_items: [
            { id: "img-1", prompt: "海边日出", refs: ["shot-1"], modality: "image" },
            { id: "img-2", prompt: "城市夜景", modality: "image" },
          ],
        },
        runtime: { status: "waiting_user", waiting_reason: "plan_review" },
      },
    ],
  });

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-plan-review-"));
    process.env.WORKSPACE_DIR = ws;
    mkdirSync(path.join(ws, ".hilo", "plan"), { recursive: true });
    writeFileSync(path.join(ws, ".hilo", "plan", "plan_a.json"), JSON.stringify(plan()));
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("review：拍平成看板的审阅模型，下一个阶段在等审阅", async () => {
    const r = await http.get("/api/plan/review?id=plan_a");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ revision: 3, title: "短片计划", waiting_user: true, pending_stages: [{ id: "s3", order: 3, name: "剪辑" }] });
    expect(r.body.next_stage).toMatchObject({ id: "s2", name: "出图", status: "waiting_user", waiting_reason: "plan_review", work_item_count: 2, produced_count: 0 });
    expect(r.body.next_stage.work_items[0]).toEqual({ id: "img-1", prompt: "海边日出", refs: "[shot-1]", modality: "image" });
    expect(r.body.next_stage.reference_labels).toEqual({ "src-1": "剧本" });
    expect(r.body.next_stage.reference_items["shot-1"]).toEqual({ id: "shot-1", prompt: "开场", path: "a.md" });
    expect(r.body.stages[0]).toMatchObject({ id: "s1", status: "done", produced_count: 1 });
    expect((await http.get("/api/plan/review")).status).toBe(400);
    expect((await http.get("/api/plan/review?id=a%2Fb")).status).toBe(400);
    expect((await http.get("/api/plan/review?id=nope")).status).toBe(404);
  });

  it("stage-work-items：改提示词 / 引用并补引用胶囊，revision +1，广播 plan_changed", async () => {
    const r = await http.patch("/api/plan/stage-work-items").send({
      plan_id: "plan_a",
      stage_id: "s2",
      expected_revision: 3,
      patches: [
        { item_id: "img-1", prompt: "海边日落" },
        { item_id: "img-2", refs: ["ref-sky"] },
      ],
      reference_items: [{ id: "ref-sky", name: "天空素材", modality: "image", path: "sky.png", asset_id: "a1" }],
    });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, plan_id: "plan_a", stage_id: "s2", revision: 4, changed_item_ids: ["img-1", "img-2"] });
    expect(events.at(-1)).toEqual({ event: "plan:changed", payload: { type: "plan_changed", plan_id: "plan_a", revision: 4, action: "patch_work_items", stage_ids: ["s2"] } });
    const saved = JSON.parse(readFileSync(path.join(ws, ".hilo", "plan", "plan_a.json"), "utf8"));
    expect(saved.stages[1].contract.work_items[1].refs).toEqual(["ref-sky"]);
    expect(saved.stages[1].contract.ref_capsules).toEqual([{ id: "ref-sky", name: "天空素材", modality: "image", path: "sky.png", asset_id: "a1" }]);
    // 同样的修改再来一次：没有变化，不涨 revision、不广播。
    const n = events.length;
    const same = await http.patch("/api/plan/stage-work-items").send({ plan_id: "plan_a", stage_id: "s2", expected_revision: 4, patches: [{ item_id: "img-1", prompt: "海边日落" }] });
    expect(same.body).toMatchObject({ revision: 4, changed_item_ids: [] });
    expect(events.length).toBe(n);
  });

  it("stage-work-items：revision 对不上 409，阶段不在审阅 / 工作项不存在 400，计划不存在 404", async () => {
    const base = { plan_id: "plan_a", stage_id: "s2", patches: [{ item_id: "img-1", prompt: "x" }] };
    expect((await http.patch("/api/plan/stage-work-items").send({ ...base, expected_revision: 1 })).status).toBe(409);
    expect((await http.patch("/api/plan/stage-work-items").send({ ...base, stage_id: "s1", expected_revision: 4 })).status).toBe(400);
    expect((await http.patch("/api/plan/stage-work-items").send({ ...base, expected_revision: 4, patches: [{ item_id: "ghost", prompt: "x" }] })).status).toBe(400);
    expect((await http.patch("/api/plan/stage-work-items").send({ ...base, expected_revision: 4, patches: [] })).status).toBe(400);
    expect((await http.patch("/api/plan/stage-work-items").send({ ...base, expected_revision: 0 })).status).toBe(400);
    expect((await http.patch("/api/plan/stage-work-items").send({ ...base, plan_id: "missing", expected_revision: 1 })).status).toBe(404);
  });
});
