import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText } from "../testing/harness.js";
import { registerV3Tools } from "./v3-tools.js";

/**
 * `design_read` 的两条来源各走各的接口：
 *
 * - `versionId` → `POST /api/v3/query/document_read`（Resource 版本正文，带 contentRevision）
 * - `file_path` → `GET /api/internal/document/read`（磁盘文件/目录）
 *
 * 之前两条都被写成了 `GET /api/project/resources/read` —— 那条路由从来没存在过，
 * 所以 agent 每次 read 都 404、只能退回 bash 去 cat。这两条用例把接线钉住。
 */
describe("design_read 的接线", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;

  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => {
    await gw.close();
  });

  it("versionId：走 query/document_read，offset/limit 映射成 startLine/lineCount", async () => {
    gw.on("POST", "/api/v3/query/document_read", {
      json: { versionId: "ver_1", contentRevision: 7, text: "一\n二", startLine: 3, lineCount: 2, totalLines: 9, more: true },
    });
    const r = await h.call("read", { versionId: "ver_1", offset: 3, limit: 2, contentRevision: 7 });
    const body = resultJson(r) as Record<string, unknown>;
    expect(body).toMatchObject({ versionId: "ver_1", contentRevision: 7, startLine: 3, lineCount: 2, totalLines: 9, more: true, nextOffset: 5 });
    expect(resultText(r)).toContain("一\\n二");
    const sent = gw.requests.find((req) => req.path === "/api/v3/query/document_read");
    expect(sent?.body).toEqual({ versionId: "ver_1", startLine: 3, lineCount: 2, contentRevision: 7 });
  });

  it("file_path：走 internal/document/read，并把 query 原样带上", async () => {
    gw.on("GET", "/api/internal/document/read", {
      json: { ok: true, kind: "text", lines: ["a", "b"], offset: 1, totalLines: 12, more: true },
    });
    const r = await h.call("read", { file_path: "/data/.config-v2/knowledge/vendors/minimax.md", limit: 2 });
    const body = resultJson(r) as Record<string, unknown>;
    expect(body).toMatchObject({ kind: "text", startLine: 1, lineCount: 2, totalLines: 12, nextOffset: 3 });
    const sent = gw.requests.find((req) => req.path === "/api/internal/document/read");
    expect(sent?.query.get("path")).toBe("/data/.config-v2/knowledge/vendors/minimax.md");
    expect(sent?.query.get("limit")).toBe("2");
  });

  it("file_path 失败时把后端 reason 翻译成人话，而不是 404 堆栈", async () => {
    gw.on("GET", "/api/internal/document/read", { json: { ok: false, reason: "not-found" } });
    const r = await h.call("read", { file_path: "/nope.md" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toContain("file not found");
  });

  it("两个都给或都不给：直接报错，不打后端", async () => {
    const both = await h.call("read", { versionId: "ver_1", file_path: "/a.md" });
    expect(both.isError).toBe(true);
    const neither = await h.call("read", {});
    expect(neither.isError).toBe(true);
    expect(gw.requests).toHaveLength(0);
  });
});

/** 另外两条同类接线问题：capability_list 的逗号拼接、composition_type_list 的裸数组。 */
describe("capability_list / composition_type_list 的接线", () => {
  let gw: FakeGateway;
  let h: ReturnType<typeof createHarness>;

  beforeEach(async () => {
    gw = await startFakeGateway();
    h = createHarness();
    registerV3Tools(h.registrar, gatewayFor(gw.url), "overseas");
  });
  afterEach(async () => {
    await gw.close();
  });

  it("capability_list：多个 operation 用重复参数（不要逗号拼）", async () => {
    gw.on("GET", "/api/v3/capabilities", { json: { capabilities: [] } });
    await h.call("capability_list", { operation: ["generate_image", "generate_video"] });
    const sent = gw.requests.find((req) => req.path === "/api/v3/capabilities");
    expect(sent?.query.getAll("operation")).toEqual(["generate_image", "generate_video"]);
  });

  it("composition_type_list：网关返回裸数组时包成对象", async () => {
    gw.on("POST", "/api/project/compositions/types/list", { json: [{ typeId: "cty_1", label: "视频" }] });
    const r = await h.call("composition_type_list", {});
    expect(resultJson(r)).toEqual({ types: [{ typeId: "cty_1", label: "视频" }] });
  });
});
