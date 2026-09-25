import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { registerPlanTools } from "./plan-tools.js";

let fake: FakeGateway;
let root: string;
let h: Harness;

beforeAll(async () => {
  fake = await startFakeGateway();
  fake.on("POST", "/api/plan/notify-changed", { json: { ok: true } });
});
afterAll(() => fake.close());

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "plan-tools-"));
  fake.requests.length = 0;
  h = createHarness();
  registerPlanTools(h.registrar, gatewayFor(fake.url), "domestic");
});
afterEach(() => rm(root, { recursive: true, force: true }));

/** 成功结果必须过 outputSchema —— SDK 会做同样的校验，不过就整条调用报错。 */
async function call(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const r = await h.call(name, { projectRoot: root, ...args });
  const shape = h.tools.get(name)?.config.outputSchema as z.ZodRawShape | undefined;
  if (!r.isError && shape) z.object(shape).parse(r.structuredContent);
  return r;
}

/** 通知是不等结果发出的，可能晚于上一个用例结束才到 —— 按 plan_id 过滤。 */
function notifies(planId: string): Record<string, unknown>[] {
  return fake.requests
    .filter((r) => r.path === "/api/plan/notify-changed" && (r.body as { plan_id?: string }).plan_id === planId)
    .map((r) => r.body as Record<string, unknown>);
}

async function waitForNotify(planId: string, count: number): Promise<Record<string, unknown>[]> {
  for (let i = 0; i < 50; i++) {
    const hits = notifies(planId);
    if (hits.length >= count) return hits;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("notify-changed not received");
}

function samplePlan() {
  return {
    title: "Demo",
    workflow: { path: "workflows/general-video.md" },
    sources: [{ id: "brief", path: "brief.md" }],
    stage_outline: [
      { id: "s1", order: 1, name: "Key art" },
      { id: "s2", order: 2, name: "Variants" },
      { id: "s3", order: 3, name: "Delivery" },
    ],
    stages: [
      { stage_id: "s1", order: 1, goal: "Make key art", work_items: [{ id: "img_a", modality: "image", prompt: "a cat" }] },
      {
        stage_id: "s2",
        order: 2,
        goal: "Make variants",
        depends_on: ["s1"],
        review: { after_execution: ["Check the variants"] },
        work_items: [{ id: "img_b", modality: "image", prompt: "a dog", refs: ["img_a"] }],
      },
    ],
  };
}

async function writePlan(): Promise<string> {
  const r = await call("plan_write", { plan: samplePlan() });
  expect(r.isError, resultText(r)).toBeFalsy();
  return resultJson<{ plan_id: string }>(r).plan_id;
}

describe("plan tools", () => {
  it("plan_write creates the file and status/work items read it back", async () => {
    const planId = await writePlan();
    expect(planId).toMatch(/^plan_[0-9a-f]{18}$/);
    const file = JSON.parse(await readFile(path.join(root, ".hilo", "plan", `${planId}.json`), "utf8"));
    expect(file.revision).toBe(1);
    expect(file.stages[0].runtime).toEqual({ status: "doing" });

    const status = resultJson(await call("plan_get_stage_status", { plan_id: planId }));
    expect(status.revision).toBe(1);
    expect(status.stage_count).toBe(2);
    expect(status.next_action).toBe("execute_stage");
    expect((status.next_stage as { id: string }).id).toBe("s1");
    expect(status.pending_stages).toEqual([{ id: "s3", order: 3, name: "Delivery" }]);
    expect(status.workflow_path).toBe("workflows/general-video.md");

    const items = resultJson(await call("plan_get_work_items", { plan_id: planId, stage_id: "s2", work_item_ids: ["img_b"] }));
    expect(items.work_items).toEqual([{ id: "img_b", modality: "image", prompt: "a dog", refs: "[img_a]" }]);

    const missing = await call("plan_get_work_items", { plan_id: planId, stage_id: "s2", work_item_ids: ["nope"] });
    expect(missing.isError).toBe(true);
    expect(resultText(missing)).toContain("missing_work_item_ids");

    const [notify] = await waitForNotify(planId, 1);
    expect(notify).toEqual({ plan_id: planId, revision: 1, action: "write", stage_ids: ["s1", "s2"] });
  });

  it("rejects semantically invalid plans before writing", async () => {
    const plan = samplePlan();
    plan.stages[0]!.work_items = [{ id: "img_a", modality: "image" } as never];
    const r = await call("plan_write", { plan });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toContain("generated media work item must carry a planner-authored prompt");
  });

  it("rejects a stale expected_revision", async () => {
    const planId = await writePlan();
    const w = await call("plan_write", { plan: samplePlan(), plan_id: planId, expected_revision: 5 });
    expect(w.isError).toBe(true);
    expect(resultText(w)).toContain("Stage plan revision conflict: expected 5, found 1");

    const u = await call("plan_update_stage_state", {
      plan_id: planId,
      expected_revision: 3,
      updates: [{ stage_id: "s1", status: "done" }],
    });
    expect(u.isError).toBe(true);
    expect(resultJson(u)).toMatchObject({ ok: false, count: 0, updated: [] });

    const ok = await call("plan_write", { plan: samplePlan(), plan_id: planId, expected_revision: 1 });
    expect(ok.isError).toBeFalsy();
    const status = resultJson(await call("plan_get_stage_status", { plan_id: planId }));
    expect(status.revision).toBe(2);
  });

  it("plan_update_stage_state routes completion through review and guards transitions", async () => {
    const planId = await writePlan();
    // s2 依赖的 s1 未完成：执行就绪检查拒绝
    const early = await call("plan_update_stage_state", { plan_id: planId, updates: [{ stage_id: "s2", status: "done" }] });
    expect(early.isError).toBe(true);
    expect(resultText(early)).toContain('direct dependency stage "s1" is doing');

    const undeclared = await call("plan_update_stage_state", {
      plan_id: planId,
      updates: [{ stage_id: "s1", status: "done", outputs: [{ id: "other", path: "x.png" }] }],
    });
    expect(resultText(undeclared)).toContain('Stage s1 output id "other" is not declared in work_items');

    const s1 = resultJson(
      await call("plan_update_stage_state", {
        plan_id: planId,
        updates: [{ stage_id: "s1", status: "done", outputs: [{ id: "img_a", path: "out/a.png" }] }],
      }),
    );
    expect(s1.updated).toEqual([{ stage: expect.objectContaining({ id: "s1", status: "done" }), previous_status: "doing" }]);

    // 有后置评审：请求 done 实际进入 waiting_user(result_review)
    const s2 = resultJson(
      await call("plan_update_stage_state", {
        plan_id: planId,
        updates: [{ stage_id: "s2", status: "done", outputs: [{ id: "img_b", path: "out/b.png" }] }],
      }),
    );
    expect(s2.updated).toEqual([
      { stage: expect.objectContaining({ id: "s2", status: "waiting_user", waiting_reason: "result_review" }), previous_status: "doing" },
    ]);
    const waiting = resultJson(await call("plan_get_stage_status", { plan_id: planId }));
    expect(waiting.next_action).toBe("wait_for_user");
    expect(waiting.waiting_user).toBe(true);

    const accepted = resultJson(await call("plan_update_stage_state", { plan_id: planId, updates: [{ order: 2, status: "done" }] }));
    expect((accepted.updated as { stage: { status: string } }[])[0]!.stage.status).toBe("done");

    const back = await call("plan_update_stage_state", { plan_id: planId, updates: [{ stage_id: "s1", status: "doing" }] });
    expect(back.isError).toBe(true);
    expect(resultText(back)).toContain("is done and cannot return to doing");

    const both = await call("plan_update_stage_state", { plan_id: planId, updates: [{ stage_id: "s1", order: 1, status: "done" }] });
    expect(resultText(both)).toContain("exactly one of stage_id or order");

    const blocked = await call("plan_update_stage_state", { plan_id: planId, updates: [{ stage_id: "s2", status: "blocked" }] });
    expect(blocked.isError).toBe(true);

    // 只剩未写的 s3：不给 next_action，只给 pending_stages
    const status = resultJson(await call("plan_get_stage_status", { plan_id: planId }));
    expect(status.next_action).toBeUndefined();
    expect(status.pending_stages).toEqual([{ id: "s3", order: 3, name: "Delivery" }]);
  });

  it("plan_patch_stage upserts, omits and removes", async () => {
    const planId = await writePlan();
    await call("plan_update_stage_state", {
      plan_id: planId,
      updates: [{ stage_id: "s1", status: "done", outputs: [{ id: "img_a", path: "out/a.png" }] }],
    });

    // 新写 s3：新 stage 取初始状态
    const s3 = {
      stage_id: "s3",
      order: 3,
      goal: "Deliver",
      depends_on: ["s2"],
      review: { before_execution: ["Confirm delivery format"] },
      work_items: [{ id: "final", modality: "image", prompt: "final", refs: "img_b" }],
    };
    const up = resultJson(await call("plan_patch_stage", { plan_id: planId, stage: s3 }));
    expect(up.patched).toEqual({ stage_id: "s3", action: "upsert" });
    expect(up.pending_stages).toEqual([]);
    expect((up.stages as { id: string; status: string; waiting_reason?: string }[])[2]).toMatchObject({
      id: "s3",
      status: "waiting_user",
      waiting_reason: "plan_review",
    });

    // 改 s1 的执行内容：runtime 回到初始状态，旧输出进 superseded
    const s1 = { stage_id: "s1", order: 1, goal: "Make key art", work_items: [{ id: "img_a", modality: "image", prompt: "a tabby cat" }] };
    await call("plan_patch_stage", { plan_id: planId, stage: s1 });
    const file = JSON.parse(await readFile(path.join(root, ".hilo", "plan", `${planId}.json`), "utf8"));
    expect(file.stages[0].runtime).toEqual({ status: "doing", superseded_runtime_refs: [{ id: "img_a", path: "out/a.png" }] });

    const mismatch = await call("plan_patch_stage", { plan_id: planId, stage_id: "s2", stage: s1 });
    expect(resultText(mismatch)).toContain("does not match stage_id");

    const omitAuthored = await call("plan_patch_stage", { plan_id: planId, stage_id: "s3", omit: true });
    expect(resultText(omitAuthored)).toContain("Authored Stage cannot be omitted");

    const removed = resultJson(await call("plan_patch_stage", { plan_id: planId, stage_id: "s3", remove: true }));
    expect(removed.patched).toEqual({ stage_id: "s3", action: "remove" });
    expect(removed.stage_count).toBe(2);

    const sent = await waitForNotify(planId, 5);
    expect(sent.map((n) => n.action)).toEqual(["write", "update_stage_state", "patch_stage", "patch_stage", "remove_stage"]);
  });

  it("omits a pending outline entry without changing orders", async () => {
    const planId = await writePlan();
    const r = resultJson(await call("plan_patch_stage", { plan_id: planId, stage_id: "s3", omit: true }));
    expect(r.patched).toEqual({ stage_id: "s3", action: "omit" });
    expect(r.pending_stages).toEqual([]);
    const file = JSON.parse(await readFile(path.join(root, ".hilo", "plan", `${planId}.json`), "utf8"));
    expect(file.stage_outline[2]).toEqual({ id: "s3", order: 3, name: "Delivery", omitted: true });
  });

  it("plan_replan revises the frontier, replays by request_id, and guards the prefix", async () => {
    const planId = await writePlan();
    await call("plan_update_stage_state", {
      plan_id: planId,
      updates: [{ stage_id: "s1", status: "done", outputs: [{ id: "img_a", path: "out/a.png" }] }],
    });
    const request = {
      plan_id: planId,
      request_id: "req-1",
      expected_revision: 2,
      reason: "User wants dogs in the rain",
      operations: [
        {
          type: "revise_stage",
          stage: {
            stage_id: "s2",
            name: "Rainy variants",
            goal: "Make rainy variants",
            depends_on: ["s1"],
            work_items: [{ id: "img_b", modality: "image", prompt: "a dog in the rain", refs: ["img_a"] }],
          },
        },
        { type: "insert_stage_outline", after_stage_id: "s2", stage: { stage_id: "s2b", name: "Extras" } },
      ],
    };
    const r = await call("plan_replan", request);
    expect(r.isError, resultText(r)).toBeFalsy();
    const body = resultJson(r);
    expect(body).toMatchObject({ ok: true, state: "applied", revision: 3, workflow_path: "workflows/general-video.md" });
    expect(body.impact).toEqual({
      preserve_through_stage_id: "s1",
      changed_stage_ids: ["s2", "s2b"],
      invalidated_stage_ids: ["s2"],
      preserved_stage_ids: ["s1"],
      resume_stage_id: "s2",
    });
    expect(body.operation_summary).toMatchObject({ revised_stage_ids: ["s2"], outlined_stage_ids: ["s2b"] });
    expect(body.pending_stages).toEqual([
      { id: "s2b", order: 3, name: "Extras" },
      { id: "s3", order: 4, name: "Delivery" },
    ]);

    // 同一 request_id 重放：结果相同，不再通知
    const replay = resultJson(await call("plan_replan", request));
    expect(replay.revision).toBe(3);
    expect(replay.operation_digest).toBe(body.operation_digest);
    await waitForNotify(planId, 3);
    await new Promise((res) => setTimeout(res, 50));
    expect(notifies(planId).map((n) => n.action)).toEqual([
      "write",
      "update_stage_state",
      "replan",
    ]);

    // 改前沿之前（已接受的前缀）的 stage：拒绝并给出边界信息
    const prefix = await call("plan_replan", {
      plan_id: planId,
      request_id: "req-2",
      expected_revision: 3,
      reason: "change key art",
      operations: [{ type: "revise_stage", stage: { stage_id: "s1", goal: "x", work_items: [{ id: "img_a", modality: "image", prompt: "y" }] } }],
    });
    expect(prefix.isError).toBe(true);
    const err = resultJson<{ error: { code: string; current_state: Record<string, string> } }>(prefix).error;
    expect(err.code).toBe("REPLAN_FRONTIER_MISMATCH");
    expect(err.current_state).toMatchObject({ current_frontier_stage_id: "s2", expected_preserve_through_stage_id: "s1" });

    const stale = await call("plan_replan", { ...request, request_id: "req-3", expected_revision: 1 });
    expect(resultJson<{ error: { code: string; requires_reread: boolean } }>(stale).error).toMatchObject({
      code: "PLAN_REVISION_CONFLICT",
      requires_reread: true,
    });
  });

  it("plan_get_stage_detail reports readiness and attaches cached ref analyses", async () => {
    fake.on("GET", "/api/assets", {
      json: {
        assets: [
          {
            id: "asset-1",
            path: "out/a.png",
            width: 1024,
            height: 768,
            metadata: {
              read_media_cache: {
                version: "semantic-v3",
                entries: {
                  k1: { version: "semantic-v3", text: "old", updated_at: "2026-01-01" },
                  k2: { version: "semantic-v3", text: "a tabby cat", updated_at: "2026-02-01" },
                },
              },
            },
          },
        ],
      },
    });
    const planId = await writePlan();
    const blocked = resultJson(await call("plan_get_stage_detail", { plan_id: planId, stage_id: "s2" }));
    expect(blocked.can_execute).toBe(false);
    expect(blocked.blocked_reason).toBe("Earlier Stage s1 must be resolved before Stage s2 can execute.");

    await call("plan_update_stage_state", {
      plan_id: planId,
      updates: [{ stage_id: "s1", status: "done", outputs: [{ id: "img_a", path: "out/a.png" }] }],
    });
    const detail = resultJson(await call("plan_get_stage_detail", { plan_id: planId, order: 2 }));
    expect(detail.can_execute).toBe(true);
    expect(detail.upstream_runtime_refs).toEqual([{ id: "img_a", path: "out/a.png", source_stage_id: "s1" }]);
    expect(detail.ref_analyses).toEqual([{ ids: ["img_a"], analysis: "a tabby cat", width: 1024, height: 768 }]);
    expect(fake.requests.some((q) => q.path === "/api/assets" && q.query.get("include") === "metadata")).toBe(true);

    const none = await call("plan_get_stage_detail", { plan_id: planId });
    expect(resultText(none)).toBe("Provide either stage_id or order.");
  });

  it("a dead gateway does not fail plan writes", async () => {
    const dead = createHarness();
    registerPlanTools(dead.registrar, gatewayFor("http://127.0.0.1:1"), "domestic");
    const r = await dead.call("plan_write", { projectRoot: root, plan: samplePlan() });
    expect(r.isError).toBeFalsy();
    const detail = await dead.call("plan_get_stage_detail", { projectRoot: root, plan_id: resultJson<{ plan_id: string }>(r).plan_id, stage_id: "s1" });
    expect(detail.isError).toBeFalsy();
    expect(resultJson(detail).ref_analyses).toEqual([]);
  });

  it("missing plans and bad ids surface as tool errors", async () => {
    const r = await call("plan_get_stage_status", { plan_id: "plan_missing" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe("Stage plan not found: plan_missing");
    const bad = await call("plan_get_stage_status", { plan_id: "../escape" });
    expect(resultText(bad)).toContain("Invalid stagePlanId for plan file path");
  });
});
