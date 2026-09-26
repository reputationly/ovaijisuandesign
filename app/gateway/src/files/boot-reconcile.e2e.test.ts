import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

describe("工作区 gateway 启动时对账", () => {
  let app: INestApplication;
  let root = "";

  beforeAll(async () => {
    root = mkdtempSync(path.join(tmpdir(), "ov-boot-reconcile-"));
    // 应用没开的时候放进来的文件：还没登记
    writeFileSync(path.join(root, "早就在的.png"), PNG);
    process.env.WORKSPACE_DIR = root;
    process.env.HILO_DATA_DIR = path.join(root, ".hub");
    process.env.HILO_GATEWAY_ROLE = "workspace";
    app = await createApp();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    for (const k of ["WORKSPACE_DIR", "HILO_DATA_DIR", "HILO_GATEWAY_ROLE"]) delete process.env[k];
    rmSync(root, { recursive: true, force: true });
  });

  it("起来之后不用手动调对账，已有文件就出现在资产列表里", async () => {
    const http = request(app.getHttpServer());
    let paths: string[] = [];
    for (let i = 0; i < 50 && !paths.includes("早就在的.png"); i++) {
      await new Promise((r) => setTimeout(r, 100));
      paths = ((await http.get("/api/assets")).body.assets as { path: string }[]).map((a) => a.path);
    }
    expect(paths).toContain("早就在的.png");
  });
});
