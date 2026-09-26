import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

describe("对话附件暂存提交 / 首页附件搬运（真实工作区）", () => {
  let app: INestApplication;
  let ws: string;
  let out: string;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-commit-"));
    out = mkdtempSync(path.join(tmpdir(), "ov-output-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.OUTPUT_DIR = out;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.OUTPUT_DIR;
  });

  const stage = async (name: string, bytes: Buffer | string = PNG) => {
    const r = await http.post("/api/upload").field("staging", "true").attach("file", Buffer.from(bytes), name);
    expect(r.body.staged).toBe(true);
    return r.body.relative as string;
  };

  describe("commit", () => {
    let staged = "";
    let ctx = "";
    const op = randomUUID();
    let first: any;

    it("发布到根目录并登记（回 attachment_refs）；只给对话用的进 chat-context、不登记", async () => {
      staged = await stage("图.png");
      ctx = await stage("说明.txt", "hello");
      writeFileSync(path.join(ws, "图.png"), "已经有一个同名的");
      const r = await http.post("/api/upload/commit").send({ paths: [staged, ctx, "已在工作区.md"], operationId: op, contextPaths: [ctx] });
      expect(r.status).toBe(201);
      first = r.body;
      expect(r.body.committed).toEqual([
        { from: staged, to: "图(1).png" },
        { from: ctx, to: ".hilo/chat-context/说明.txt" },
        { from: "已在工作区.md", to: "已在工作区.md" },
      ]);
      expect(r.body.attachment_refs).toHaveLength(1);
      expect(r.body.attachment_refs[0]).toMatchObject({ path: "图(1).png", attachment_source: "asset_vault" });
      expect(readFileSync(path.join(ws, "图(1).png"))).toEqual(PNG);
      // 同盘上是硬链接：不多占空间。
      expect(statSync(path.join(ws, "图(1).png")).ino).toBe(statSync(path.join(ws, staged)).ino);
      const assets = (await http.get("/api/assets")).body.assets.map((a: any) => a.path);
      expect(assets).toContain("图(1).png");
      expect(assets.some((p: string) => p.includes("chat-context"))).toBe(false);
    });

    it("同一个 operationId 重发：按台账原样回放，不会多出 图(2).png", async () => {
      const r = await http.post("/api/upload/commit").send({ paths: [staged, ctx, "已在工作区.md"], operationId: op, contextPaths: [ctx] });
      expect(r.body).toEqual(first);
      expect(existsSync(path.join(ws, "图(2).png"))).toBe(false);
      // 同一个 id 换了一批路径是调用方的错。
      expect((await http.post("/api/upload/commit").send({ paths: [staged], operationId: op })).status).toBe(400);
    });

    it("参数校验：operationId 必须是 UUID、路径不能重复、contextPaths 必须在 paths 里、暂存路径不能越界", async () => {
      expect((await http.post("/api/upload/commit").send({ paths: [staged] })).status).toBe(400);
      expect((await http.post("/api/upload/commit").send({ paths: [staged], operationId: "x" })).status).toBe(400);
      expect((await http.post("/api/upload/commit").send({ paths: "a", operationId: randomUUID() })).status).toBe(400);
      expect((await http.post("/api/upload/commit").send({ paths: [staged, staged], operationId: randomUUID() })).status).toBe(400);
      expect((await http.post("/api/upload/commit").send({ paths: [staged], operationId: randomUUID(), contextPaths: ["other"] })).status).toBe(400);
      const escape = `.hilo/.tmp/uploads/${randomUUID()}/../../../../etc/passwd`;
      expect((await http.post("/api/upload/commit").send({ paths: [escape], operationId: randomUUID() })).status).toBe(400);
      expect((await http.post("/api/upload/commit").send({ paths: [`.hilo/.tmp/uploads/${randomUUID()}/nope.png`], operationId: randomUUID() })).status).toBe(400);
      expect((await http.post("/api/upload/commit").send({ paths: Array.from({ length: 21 }, (_, i) => `f${i}`), operationId: randomUUID() })).status).toBe(400);
    });

    it("还没确认的提交：暂存源不许删（409），abort 也不回滚（409）；没发布过的 abort 直接 ok", async () => {
      expect((await http.post("/api/upload/staging/delete").send({ paths: [staged] })).status).toBe(409);
      expect((await http.post("/api/upload/commit/abort").send({ operationId: op, paths: ["图(1).png"] })).status).toBe(409);
      expect((await http.post("/api/upload/commit/abort").send({ operationId: op, paths: ["别的.png"] })).status).toBe(400);
      expect((await http.post("/api/upload/commit/abort").send({ operationId: randomUUID(), paths: ["x.png"] })).body).toEqual({ ok: true });
      expect((await http.post("/api/upload/commit/abort").send({ operationId: "bad", paths: [] })).status).toBe(400);
    });

    it("finalize：删掉暂存源和 uuid 目录，发布出去的文件还在；之后重复 finalize 也 ok", async () => {
      expect((await http.post("/api/upload/commit/finalize").send({ operationId: op })).body).toEqual({ ok: true });
      expect(existsSync(path.join(ws, staged))).toBe(false);
      expect(existsSync(path.dirname(path.join(ws, staged)))).toBe(false);
      expect(readFileSync(path.join(ws, "图(1).png"))).toEqual(PNG);
      expect((await http.post("/api/upload/commit/finalize").send({ operationId: op })).body).toEqual({ ok: true });
      expect((await http.post("/api/upload/commit/finalize").send({ operationId: "nope" })).status).toBe(400);
    });
  });

  it("staging/delete：删暂存文件；非暂存路径忽略；越界 400", async () => {
    const s = await stage("废弃.png");
    expect((await http.post("/api/upload/staging/delete").send({ paths: [s, "图(1).png"] })).body).toEqual({ ok: true });
    expect(existsSync(path.join(ws, s))).toBe(false);
    expect(existsSync(path.join(ws, "图(1).png"))).toBe(true);
    expect((await http.post("/api/upload/staging/delete").send({ paths: [".hilo/.tmp/uploads/x/../../../图(1).png"] })).status).toBe(400);
    expect((await http.post("/api/upload/staging/delete").send({ paths: "x" })).status).toBe(400);
  });

  describe("adopt", () => {
    it("从输出目录复制进工作区、保持子目录、同名加 _1、登记；带 idempotency-key 重试原样回放", async () => {
      mkdirSync(path.join(out, "sub"), { recursive: true });
      writeFileSync(path.join(out, "sub/ref.png"), PNG);
      mkdirSync(path.join(ws, "sub"), { recursive: true });
      writeFileSync(path.join(ws, "sub/ref.png"), "占位");
      const key = randomUUID();
      const r = await http.post("/api/files/adopt").set("idempotency-key", key).send({ paths: ["sub/ref.png"], targetDir: ws });
      expect(r.status).toBe(200);
      expect(r.body.paths).toEqual(["sub/ref_1.png"]);
      expect(r.body.adopted[0]).toMatchObject({ source: "sub/ref.png", destination: "sub/ref_1.png" });
      expect(r.body.adopted[0].attachment_id).toBeTruthy();
      expect(r.body.errors).toEqual([]);
      const again = await http.post("/api/files/adopt").set("idempotency-key", key).send({ paths: ["sub/ref.png"], targetDir: ws });
      expect(again.body.paths).toEqual(["sub/ref_1.png"]);
      expect(readdirSync(path.join(ws, "sub")).sort()).toEqual(["ref.png", "ref_1.png"]);
    });

    it("部分失败回 207；源越界、目标不是本工作区、key 不是 UUID 都 400", async () => {
      const r = await http.post("/api/files/adopt").send({ paths: ["没有.png"], targetDir: ws });
      expect(r.status).toBe(207);
      expect(r.body.errors[0]).toMatchObject({ source: "没有.png", code: "source_not_found" });
      expect((await http.post("/api/files/adopt").send({ paths: ["../x.png"], targetDir: ws })).status).toBe(400);
      expect((await http.post("/api/files/adopt").send({ paths: ["/etc/hosts"], targetDir: ws })).status).toBe(400);
      expect((await http.post("/api/files/adopt").send({ paths: ["sub/ref.png"], targetDir: out })).status).toBe(400);
      expect((await http.post("/api/files/adopt").send({ paths: ["sub/ref.png"], targetDir: "relative" })).status).toBe(400);
      expect((await http.post("/api/files/adopt").set("idempotency-key", "k").send({ paths: ["sub/ref.png"], targetDir: ws })).status).toBe(400);
    });
  });

  it("upload-cdn：本地版不连云，给出和云端一致的本地检查结果", async () => {
    expect((await http.post("/api/files/upload-cdn").send({ file_path: "没有.png" })).body).toEqual({ ok: false, error: "File not found: 没有.png" });
    const r = await http.post("/api/files/upload-cdn").send({ file_path: "图(1).png" });
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toMatch(/^CDN upload error:/);
    const m = await http.post("/api/files/upload-cdn").attach("file", PNG, "x.png");
    expect(m.body.ok).toBe(false);
    expect((await http.post("/api/files/upload-cdn").send({})).status).toBe(400);
  });
});
