import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");

describe("资产血缘", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let parent = "";
  let child = "";

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-deps-"));
    process.env.WORKSPACE_DIR = ws;
    writeFileSync(path.join(ws, "parent.png"), PNG);
    writeFileSync(path.join(ws, "child.png"), PNG);
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    const assets = app.get(AssetsService);
    parent = (await assets.enroll("parent.png")).id;
    child = (await assets.enroll("child.png")).id;
  });

  afterAll(async () => {
    await app.close();
    rmSync(ws, { recursive: true, force: true });
    delete process.env.WORKSPACE_DIR;
  });

  it("登记边之后能从子资产回溯到父资产", async () => {
    const created = await http.post("/api/dependencies").send({ child_id: child, parent_id: parent, role: "source", operation: "img2img", input_index: 0 });
    expect(created.status).toBe(201);
    const upstream = await http.get(`/api/dependencies/${child}/upstream`);
    expect(upstream.body.nodes).toEqual([expect.objectContaining({ parent_id: parent, child_id: child, role: "source", depth: 1, operation: "img2img" })]);
    const downstream = await http.get(`/api/dependencies/${parent}/downstream`);
    expect(downstream.body.nodes[0].child_id).toBe(child);
    const inputs = await http.get(`/api/dependencies/${child}/inputs`);
    expect(inputs.body.inputs).toHaveLength(1);
    expect((await http.post("/api/dependencies").send({ child_id: child, parent_id: parent, role: "source", input_index: 0 })).status).toBe(409);
    expect((await http.delete(`/api/dependencies/${created.body.id}`)).body.deleted).toBe(true);
  });
});
