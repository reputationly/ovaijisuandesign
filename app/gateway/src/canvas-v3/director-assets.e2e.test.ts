import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const ASSET_ID = "66666666-6666-4666-8666-666666666666";
const PLY = Buffer.from("ply\nformat ascii 1.0\nend_header\n");
const GLTF = Buffer.from(JSON.stringify({ asset: { version: "2.0" } }));

describe("v3 导演资产", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-director-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("收下点云后按原字节读回，重复编号和坏文件都拒绝", async () => {
    const bad = await http.post(`/api/v3/canvas/director-assets/${ASSET_ID}`).attach("file", Buffer.from("hello"), "note.txt");
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe("Invalid director asset or bundle");
    const uploaded = await http.post(`/api/v3/canvas/director-assets/${ASSET_ID}`).attach("file", PLY, "cloud.ply");
    expect(uploaded.status).toBe(200);
    expect(uploaded.body).toMatchObject({
      id: ASSET_ID,
      name: "cloud.ply",
      url: `/api/v3/canvas/director-assets/${ASSET_ID}/files/cloud.ply`,
    });
    expect(uploaded.headers["cache-control"]).toBe("no-store");
    const read = await http.get(`/api/v3/canvas/director-assets/${ASSET_ID.toUpperCase()}/files/cloud.ply`).buffer(true);
    expect(read.status).toBe(200);
    expect(read.headers["content-type"]).toMatch(/application\/octet-stream/);
    expect(read.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
    expect(Buffer.from(read.body).equals(PLY)).toBe(true);
    const again = await http.post(`/api/v3/canvas/director-assets/${ASSET_ID}`).attach("file", PLY, "cloud.ply");
    expect(again.status).toBe(409);
    expect(again.body.message).toBe("Director asset upload conflict");
    const missing = await http.get(`/api/v3/canvas/director-assets/${ASSET_ID}/files/missing.ply`);
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Director asset not found");
    const scene = "77777777-7777-4777-8777-777777777777";
    const gltf = await http.post(`/api/v3/canvas/director-assets/${scene}`).attach("file", GLTF, "scene.gltf");
    expect(gltf.status).toBe(200);
    expect(gltf.body.name).toBe("scene.gltf");
    const broken = await http.post("/api/v3/canvas/director-assets/88888888-8888-4888-8888-888888888888").attach("file", Buffer.from(JSON.stringify({ asset: { version: "2.0" }, buffers: [{ uri: "gone.bin" }] })), "broken.gltf");
    expect(broken.status).toBe(400);
  });
});
