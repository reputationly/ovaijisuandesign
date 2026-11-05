import { describe, expect, it } from "vitest";

import { contentRevisionOf, contentTextOf, createCanvasV3TableStorage } from "./table-storage.js";

function fakeFetch(handler: (path: string, init?: RequestInit) => { ok?: boolean; status?: number; body?: unknown }) {
  const calls: { path: string; body: any }[] = [];
  const fetch2 = async (path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, body });
    const result = handler(path, init);
    return {
      ok: result.ok ?? true,
      status: result.status ?? 200,
      json: async () => result.body ?? {},
      text: async () => JSON.stringify(result.body ?? {}),
    } as unknown as Response;
  };
  return { fetch2, calls };
}

describe("表格文档存储", () => {
  it("load 走 resources/get 的 content 模式并拼回文本", async () => {
    const { fetch2, calls } = fakeFetch(() => ({
      body: { results: [{ ok: true, detail: { contentRevision: 3, content: [{ text: "{\"version\":" }, { text: "1}" }] } }] },
    }));
    const storage = createCanvasV3TableStorage({ fetch: fetch2 });
    const out = await storage.load({ resourceId: "res_1", versionId: "ver_1", contentRevision: 3 });
    expect(calls[0]!.path).toBe("api/project/resources/get");
    expect(calls[0]!.body.requests[0]).toMatchObject({ resourceId: "res_1", versionId: "ver_1", mode: "content" });
    expect(out).toEqual({ text: '{"version":1}', contentRevision: 3 });
  });

  it("save 新建时走 mode=create + format=htable，并序列化 doc", async () => {
    const { fetch2, calls } = fakeFetch(() => ({ body: { resourceId: "res_9" } }));
    const storage = createCanvasV3TableStorage({ fetch: fetch2, hash: () => "req-fixed" });
    const doc = { version: 1, columns: [{ id: "c1", title: "A" }], rows: [] };
    await storage.save({ nodeId: "n1", doc, name: "表格" });
    expect(calls[0]!.path).toBe("api/v3/document");
    expect(calls[0]!.body).toMatchObject({ requestId: "req-fixed", mode: "create", format: "htable", name: "表格" });
    expect(JSON.parse(calls[0]!.body.content)).toEqual(doc);
    expect(storage.getSnapshot()).toEqual({ pending: false, error: null });
  });

  it("save 已有版本时带 baseVersionId/baseRevision", async () => {
    const { fetch2, calls } = fakeFetch(() => ({ body: {} }));
    const storage = createCanvasV3TableStorage({ fetch: fetch2, hash: () => "req-2" });
    await storage.save({ nodeId: "n1", doc: { version: 1, columns: [], rows: [] }, name: "t", source: { resourceId: "res_1", versionId: "ver_1", contentRevision: 2 } });
    expect(calls[0]!.body).toMatchObject({ mode: "update", resourceId: "res_1", baseVersionId: "ver_1", baseRevision: 2 });
  });

  it("写失败时错误进 snapshot 并抛出", async () => {
    const { fetch2 } = fakeFetch(() => ({ ok: false, status: 409 }));
    const storage = createCanvasV3TableStorage({ fetch: fetch2, hash: () => "req-3" });
    await expect(storage.save({ nodeId: "n1", doc: { version: 1, columns: [], rows: [] }, name: "t" })).rejects.toThrow(/TABLE_DOCUMENT_WRITE_409/);
    expect(storage.getSnapshot().error).toMatch(/TABLE_DOCUMENT_WRITE_409/);
  });

  it("contentTextOf / contentRevisionOf 兼容多种分块形态", () => {
    expect(contentTextOf({ content: "abc" })).toBe("abc");
    expect(contentTextOf({ chunks: ["a", "b"] })).toBe("ab");
    expect(contentTextOf({ detail: { content: [{ text: "x" }] } })).toBe("x");
    expect(contentRevisionOf({ contentRevision: 7 })).toBe(7);
    expect(contentRevisionOf({})).toBeUndefined();
  });
});
