import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

/** 手写一个最小 PDF：一页，每个字符串一行（Helvetica）。 */
function makePdf(lines: string[]): Buffer {
  const content = "BT /F1 12 Tf 72 720 Td " + lines.map((l, i) => `${i ? "0 -16 Td " : ""}(${l}) Tj`).join(" ") + " ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

describe("GET /api/internal/document/read", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const read = (p: string, offset?: number, limit?: number) =>
    http.get("/api/internal/document/read").query({ path: p, ...(offset !== undefined ? { offset } : {}), ...(limit !== undefined ? { limit } : {}) });

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-docread-e2e-"));
    mkdirSync(path.join(ws, "docs"));
    writeFileSync(path.join(ws, "docs", "brief.pdf"), makePdf(["Hello world", "Second line", "Third line"]));
    writeFileSync(path.join(ws, "broken.pdf"), "not a pdf");
    writeFileSync(path.join(ws, "notes.txt"), "plain");
    process.env.WORKSPACE_DIR = ws;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  // 首次解析 PDF 要加载 pdfjs，Windows 的 CI 机器上会超过默认的 5 秒
  it("PDF 按行分页；绝对路径（工作区内）也认", { timeout: 30_000 }, async () => {
    const r = await read(path.join(ws, "docs", "brief.pdf"));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, offset: 1, more: false });
    expect(r.body.lines.slice(0, 3)).toEqual(["Hello world", "Second line", "Third line"]);
    const page = await read("docs/brief.pdf", 2, 1);
    expect(page.body).toMatchObject({ ok: true, lines: ["Second line"], offset: 2, more: true, totalLines: r.body.totalLines });
  });

  it("文档缓存上下文是当前工作区", async () => {
    expect((await http.get("/api/internal/document/cache-context")).body).toEqual({ workspaceRoot: ws, version: "v2-p1" });
  });

  it("目录：列一级条目，目录名带斜杠", async () => {
    const r = await read("docs");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, kind: "directory" });
    expect(r.body.lines).toContain("brief.pdf");
  });

  it("工作区外的知识卡（HILO_DATA_DIR 下）也能读——agent 读的就是这些", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "ov-docread-data-"));
    mkdirSync(path.join(dataDir, "knowledge"), { recursive: true });
    writeFileSync(path.join(dataDir, "knowledge", "minimax.md"), "# 模型卡\n第一行\n");
    process.env.HILO_DATA_DIR = dataDir;
    try {
      const card = path.join(dataDir, "knowledge", "minimax.md");
      const r = await read(card);
      expect(r.status).toBe(200);
      // 末尾换行会多出一行空行，和文档读取的口径一致。
      expect(r.body).toMatchObject({ ok: true, kind: "text", totalLines: 3 });
      expect(r.body.lines[0]).toBe("# 模型卡");
    } finally {
      delete process.env.HILO_DATA_DIR;
    }
  });

  it("各类失败的 reason", async () => {
    expect((await read("docs/brief.pdf", 999)).body).toMatchObject({ ok: false, reason: "invalid-offset", message: expect.stringMatching(/out of range/) });
    expect((await read("missing.pdf")).body).toEqual({ ok: false, reason: "not-found" });
    // 纯文本现在也能读（agent 的知识卡/技能引用都是 .md）。
    expect((await read("notes.txt")).body).toMatchObject({ ok: true, kind: "text", lines: ["plain"], totalLines: 1, more: false });
    expect((await read("../outside.pdf")).body).toEqual({ ok: false, reason: "unsupported" });
    expect((await read("/etc/hosts")).body).toEqual({ ok: false, reason: "unsupported" });
    expect((await read("")).body).toEqual({ ok: false, reason: "unsupported" });
    expect((await read("broken.pdf")).body).toEqual({ ok: false, reason: "parse-error" });
  });
});
