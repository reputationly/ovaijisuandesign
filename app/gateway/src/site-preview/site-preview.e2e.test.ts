import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const hasZip = (() => {
  try {
    execFileSync("zip", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasZip)("站点预览", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-site-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    const siteDir = path.join(ws, "site");
    mkdirSync(path.join(siteDir, "assets"), { recursive: true });
    writeFileSync(path.join(siteDir, "index.html"), "<!doctype html><h1>preview</h1>");
    writeFileSync(path.join(siteDir, "assets", "app.js"), "console.log('ok')");
    execFileSync("zip", ["-qr", path.join(ws, "site.zip"), "."], { cwd: siteDir });
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    await http.post("/api/project/resources/commands").send({
      commandId: "site-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_site", payload: { name: "site.zip", kind: 5 } },
    });
    const updated = await http.post("/api/project/resources/commands").send({
      commandId: "site-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_site",
        payload: {
          kind: "new_version",
          versionId: "ver_site",
          baseVersionId: null,
          relativePath: "site.zip",
          source: "import",
          disposition: "adopted",
          dependencies: [],
        },
      },
    });
    expect(updated.status).toBe(200);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    rmSync(ws, { recursive: true, force: true });
  });

  it("manifest 返回站点清单，未知版本返回 site:false", async () => {
    const manifest = await http.get("/api/v3/sites/ver_site/manifest");
    expect(manifest.status).toBe(200);
    expect(manifest.body).toMatchObject({ site: true, entry: "index.html", fileCount: 2 });
    const missing = await http.get("/api/v3/sites/nope/manifest");
    expect(missing.status).toBe(200);
    expect(missing.body).toEqual({ site: false });
  });

  it("按路径取文件，目录回 index.html；未知文件 404", async () => {
    const html = await http.get("/api/v3/sites/ver_site/files/index.html");
    expect(html.status).toBe(200);
    expect(html.headers["content-type"]).toContain("text/html");
    expect(html.text).toContain("preview");
    const root = await http.get("/api/v3/sites/ver_site/files/");
    expect(root.status).toBe(200);
    expect(root.text).toContain("preview");
    const js = await http.get("/api/v3/sites/ver_site/files/assets/app.js");
    expect(js.status).toBe(200);
    expect(js.headers["content-type"]).toContain("javascript");
    expect((await http.get("/api/v3/sites/ver_site/files/missing.txt")).status).toBe(404);
  });
});
