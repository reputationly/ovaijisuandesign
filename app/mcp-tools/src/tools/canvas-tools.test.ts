import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { invalidateCanvasDetailCache } from "./canvas-api.js";
import { registerCanvasTools } from "./canvas-tools.js";
import {
  applyAnchoredEdits,
  buildMarkdownOutline,
  grepTextContent,
  readTextWindow,
  splitTextForChunkedWrites,
  TEXT_NODE_CHUNK_SIZE,
} from "./canvas-text.js";

let gw: FakeGateway;
let h: Harness;

beforeEach(async () => {
  invalidateCanvasDetailCache();
  gw = await startFakeGateway();
  h = createHarness();
  registerCanvasTools(h.registrar, gatewayFor(gw.url), "domestic");
});
afterEach(async () => {
  await gw.close();
});

const textNode = (id: string, textContent: string, hash = "h1") => ({
  nodes: [{ id, type: "text", textContent, textContentHash: hash }],
});
const posts = (path: string) => gw.requests.filter((r) => r.method === "POST" && r.path === path);

describe("text helpers", () => {
  it("splits into fixed-size chunks that rejoin to the original", () => {
    const s = "x".repeat(TEXT_NODE_CHUNK_SIZE * 2 + 5);
    const chunks = splitTextForChunkedWrites(s);
    expect(chunks.map((c) => c.length)).toEqual([2800, 2800, 5]);
    expect(chunks.join("")).toBe(s);
    expect(splitTextForChunkedWrites("short")).toEqual(["short"]);
  });

  it("outline skips fenced code", () => {
    const md = "# A\n```\n# not heading\n```\n## B";
    expect(buildMarkdownOutline(md)).toEqual([
      { line: 1, text: "# A" },
      { line: 5, text: "## B" },
    ]);
  });

  it("grep reports zero-based occurrence and smart case", () => {
    const r = grepTextContent("foo\nbar foo\nFoo", "foo");
    expect(r.totalMatches).toBe(3);
    expect(r.matches.map((m) => [m.line, m.occurrence])).toEqual([
      [1, 0],
      [2, 1],
      [3, 0],
    ]);
    expect(grepTextContent("foo\nFoo", "Foo").totalMatches).toBe(1);
  });

  it("grep falls back to rendered text and returns the exact source substring", () => {
    const src = "角色：**班长**（眨眼）说话";
    const r = grepTextContent(src, "班长（眨眼）");
    expect(r.matchedVia).toBe("rendered");
    expect(r.matches[0]?.matchedText).toBe("班长**（眨眼）");
    expect(src.includes(r.matches[0]!.matchedText)).toBe(true);
  });

  it("rendered fallback: link text, escapes, list/heading/quote prefixes, table cells, fenced code", () => {
    const src = [
      "# 标题 **重点**",
      "- [x] 完成 [说明](http://a.b) 了",
      "> 引用 \\*星号\\* 字",
      "| 列一 | 列二 |",
      "|---|---|",
      "```",
      "code **kept**",
      "```",
    ].join("\n");
    const hit = (q: string) => {
      const r = grepTextContent(src, q);
      expect(r.matchedVia, q).toBe("rendered");
      const m = r.matches[0]!;
      expect(src.includes(m.matchedText)).toBe(true);
      return m;
    };
    expect(hit("标题 重点").matchedText).toBe("标题 **重点");
    expect(hit("完成 说明 了")).toMatchObject({ line: 2, matchedText: "完成 [说明](http://a.b) 了" });
    expect(hit("引用 *星号* 字").matchedText).toBe("引用 \\*星号\\* 字");
    expect(hit("列一 列二").matchedText).toBe("列一 | 列二");
    // 代码块里的 ** 在第一遍保留，只有第二遍忽略标记时才命中
    expect(hit("code kept")).toMatchObject({ line: 7, matchedText: "code **kept" });
  });

  it("rendered fallback ignores stray emphasis marks in a second pass", () => {
    const r = grepTextContent("前*后面", "前后面");
    expect(r.matchedVia).toBe("rendered");
    expect(r.matches[0]?.matchedText).toBe("前*后面");
  });

  it("invalid regex is flagged", () => {
    expect(grepTextContent("a", "(", { regex: true }).invalidPattern).toBe(true);
  });

  it("read window numbers lines and clamps", () => {
    const w = readTextWindow("a\nb\nc\nd", 2, 2);
    expect(w).toMatchObject({ startLine: 2, endLine: 3, totalLines: 4, text: "2: b\n3: c", truncated: false });
    expect(readTextWindow("a\nb", 99).startLine).toBe(2);
  });

  it("dry-run applies unique anchors and flags missing / ambiguous / overlapping ones", () => {
    const ok = applyAnchoredEdits("hello world", [{ annotationId: "a", exact: "world", replacement: "there" }]);
    expect(ok).toMatchObject({ ok: true, content: "hello there" });
    const missing = applyAnchoredEdits("hello", [{ annotationId: "a", exact: "nope", replacement: "x" }]);
    expect(missing.ok).toBe(false);
    expect(missing.results[0]?.reason).toBe("not_found");
    const amb = applyAnchoredEdits("aa aa", [{ annotationId: "a", exact: "aa", replacement: "b" }]);
    expect(amb.results[0]?.reason).toBe("ambiguous");
    const second = applyAnchoredEdits("aa aa", [{ annotationId: "a", exact: "aa", occurrence: 1, replacement: "b" }]);
    expect(second).toMatchObject({ ok: true, content: "aa b" });
    const overlap = applyAnchoredEdits("abcdef", [
      { annotationId: "a", exact: "abcd", replacement: "x" },
      { annotationId: "b", exact: "cdef", replacement: "y" },
    ]);
    expect(overlap.results.map((r) => r.reason)).toEqual(["overlap", "overlap"]);
  });
});

describe("canvas_write_node", () => {
  it("creates a long text node in 2800-char chunks: create, then append without separator", async () => {
    let n = 0;
    gw.on("POST", "/api/safety/check-text", { json: { pass: true, decision: "pass" } });
    gw.on("POST", "/api/canvas/text-node", (req) => {
      n += 1;
      const body = req.body as { content: string };
      return { json: { nodeId: "t1", assetId: "a1", contentLength: n * 1000 + body.content.length, created: n === 1, path: "notes/doc.md" } };
    });
    const content = "a".repeat(2800) + "b".repeat(2800) + "c".repeat(100);
    const r = await h.call("canvas_write_node", { kind: "text", name: "doc", content, sourceNodeId: "s1" });
    const writes = posts("/api/canvas/text-node").map((x) => x.body as Record<string, unknown>);
    expect(writes).toHaveLength(3);
    expect(writes[0]).toEqual({ content: "a".repeat(2800), name: "doc", sourceNodeIds: ["s1"] });
    expect(writes[1]).toEqual({ content: "b".repeat(2800), nodeId: "t1", mode: "append", appendSeparator: "none", review: "suppress" });
    expect(writes[2]).toMatchObject({ content: "c".repeat(100), nodeId: "t1", mode: "append", appendSeparator: "none" });
    const out = resultJson(r);
    expect(out).toMatchObject({ kind: "text", ok: true, nodeId: "t1", created: true, path: "notes/doc.md", contentLength: 3100 });
    // 新建时安全检查带上名字和全文
    expect((posts("/api/safety/check-text")[0]?.body as { content: string }).content).toBe(`doc\n${content}`);
  });

  it("prepend patch writes chunks back to front; only the first request carries the CAS token", async () => {
    gw.on("POST", "/api/canvas/nodes/detail", { json: textNode("t1", "tail") });
    gw.on("POST", "/api/safety/check-text", { json: { pass: true, decision: "pass" } });
    gw.on("POST", "/api/canvas/text-node", { json: { nodeId: "t1", assetId: "a1", contentLength: 1, created: false } });
    const content = "a".repeat(2800) + "b";
    await h.call("canvas_write_node", { kind: "text", nodeId: "t1", mode: "prepend", content, expectedContentHash: "H" });
    const writes = posts("/api/canvas/text-node").map((x) => x.body as Record<string, unknown>);
    expect(writes.map((w) => w.content)).toEqual(["b", "a".repeat(2800)]);
    expect(writes[0]).toMatchObject({ mode: "prepend", expectedContentHash: "H", review: "suppress" });
    expect(writes[1]).toMatchObject({ mode: "prepend", appendSeparator: "none" });
    expect(writes[1]?.expectedContentHash).toBeUndefined();
  });

  it("refuses Stage Plan content without writing", async () => {
    const r = await h.call("canvas_write_node", { kind: "text", name: "plan", content: "# Plan\n### stage_id: s1\n" });
    expect(resultJson(r)).toEqual({
      ok: false,
      kind: "text",
      error:
        "Stage Execution Plan content must be written through plan_write (create / full restructure) or plan_patch_stage (incremental stage edits), not canvas_write_node. These tools validate the whole plan before writing.",
    });
    expect(posts("/api/canvas/text-node")).toHaveLength(0);
  });

  it("create without name is a contract error", async () => {
    const r = await h.call("canvas_write_node", { kind: "text", content: "hi" });
    expect(resultJson(r)).toEqual({ kind: "text", ok: false, error: "Text node name contract violation: create mode requires a name." });
  });

  it("items[] runs each write and reports per-item results", async () => {
    gw.on("POST", "/api/safety/check-text", { json: { pass: true, decision: "pass" } });
    gw.on("POST", "/api/files/import-url", { json: { ok: true, imported: [{ url: "u", id: "i", path: "dl/x.png", type: "image" }] } });
    gw.on("POST", "/api/canvas/media-node", { json: { nodeId: "m1", assetId: "a2", assetType: "image", reused: false } });
    gw.on("POST", "/api/canvas/table-node", { json: { nodeId: "tb", tablePath: "t.htable", columnCount: 1, rowCount: 1, created: true } });
    const r = await h.call("canvas_write_node", {
      items: [
        { kind: "media", assetPath: "https://example.com/x.png" },
        { kind: "table", columns: [{ title: "A" }], rows: [{ cells: ["v"] }] },
        { kind: "media" },
      ],
    });
    const out = resultJson<{ ok: boolean; successCount: number; errorCount: number; results: Record<string, unknown>[] }>(r);
    expect(out).toMatchObject({ batch: true, ok: false, count: 3, successCount: 2, errorCount: 1 });
    expect(out.results[0]).toMatchObject({ index: 0, kind: "media", nodeId: "m1", assetPath: "dl/x.png" });
    expect(posts("/api/canvas/media-node")[0]?.body).toEqual({ assetPath: "dl/x.png" });
    expect(out.results[2]).toEqual({ index: 2, kind: "media", ok: false, error: "assetPath is required for kind=media." });
  });

  it("safety block surfaces as an error without writing", async () => {
    gw.on("POST", "/api/safety/check-text", { json: { pass: false, decision: "block" } });
    const r = await h.call("canvas_write_node", { kind: "text", name: "n", content: "bad" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe("Content blocked by safety policy (block). Please rephrase the content or choose a different topic.");
    expect(posts("/api/canvas/text-node")).toHaveLength(0);
  });

  it("safety block inside items[] fails only that item", async () => {
    gw.on("POST", "/api/safety/check-text", { json: { pass: false, decision: "block" } });
    const r = await h.call("canvas_write_node", { items: [{ kind: "text", name: "n", content: "bad" }] });
    expect(r.isError).toBeFalsy();
    expect(resultJson<{ results: unknown[] }>(r).results[0]).toEqual({ index: 0, kind: "text", ok: false, error: "Content blocked by safety policy: block" });
  });

  it("URL import failure names the URL", async () => {
    gw.on("POST", "/api/files/import-url", { json: { ok: true, imported: [] } });
    const r = await h.call("canvas_write_node", { kind: "media", assetPath: "https://example.com/x.png" });
    expect(resultJson(r)).toEqual({ ok: false, kind: "media", error: "Failed to import URL https://example.com/x.png: unknown import-url failure" });
  });
});

describe("canvas_apply_text_edits", () => {
  const applied = {
    requestId: "r",
    nodeId: "t1",
    status: "applied",
    previousContentHash: "h1",
    contentHash: "h2",
    results: [{ annotationId: "chat-edit-0", status: "applied" }],
  };

  it("valid edit: dry-run result goes to safety check, then apply-edits", async () => {
    gw.on("POST", "/api/canvas/nodes/detail", { json: textNode("t1", "hello world") });
    gw.on("POST", "/api/safety/check-text", { json: { pass: true, decision: "pass" } });
    gw.on("POST", "/api/canvas/text-node/apply-edits", { json: applied });
    const r = await h.call("canvas_apply_text_edits", {
      nodeId: "t1",
      expectedContentHash: "h1",
      edits: [{ exact: "world", replacement: "there" }],
    });
    expect(resultJson(r)).toMatchObject({ status: "applied", contentHash: "h2" });
    expect(gw.requests.map((x) => x.path)).toEqual([
      "/api/canvas/nodes/detail",
      "/api/safety/check-text",
      "/api/canvas/text-node/apply-edits",
    ]);
    expect(posts("/api/safety/check-text")[0]?.body).toEqual({ content: "hello there" });
    expect(posts("/api/canvas/text-node/apply-edits")[0]?.body).toMatchObject({
      nodeId: "t1",
      expectedContentHash: "h1",
      edits: [{ annotationId: "chat-edit-0", exact: "world", replacement: "there" }],
    });
  });

  it("anchor that does not match locally skips the safety check; the gateway reports the conflict", async () => {
    gw.on("POST", "/api/canvas/nodes/detail", { json: textNode("t1", "hello world") });
    gw.on("POST", "/api/canvas/text-node/apply-edits", {
      json: { ...applied, status: "conflict", contentHash: "h1", results: [{ annotationId: "chat-edit-0", status: "conflict", reason: "not_found" }] },
    });
    const r = await h.call("canvas_apply_text_edits", {
      nodeId: "t1",
      expectedContentHash: "h1",
      edits: [{ exact: "nowhere", replacement: "x" }],
    });
    expect(posts("/api/safety/check-text")).toHaveLength(0);
    expect(resultJson(r)).toMatchObject({ status: "conflict" });
  });

  it("safety block stops before apply-edits", async () => {
    gw.on("POST", "/api/canvas/nodes/detail", { json: textNode("t1", "hello world") });
    gw.on("POST", "/api/safety/check-text", { json: { pass: false, decision: "reject" } });
    const r = await h.call("canvas_apply_text_edits", {
      nodeId: "t1",
      expectedContentHash: "h1",
      edits: [{ exact: "world", replacement: "x" }],
    });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe("Error: Content blocked by safety policy (reject).");
    expect(posts("/api/canvas/text-node/apply-edits")).toHaveLength(0);
  });

  it("safety service failure is fail-open", async () => {
    gw.on("POST", "/api/canvas/nodes/detail", { json: textNode("t1", "hello world") });
    gw.on("POST", "/api/safety/check-text", { status: 500, json: { message: "down" } });
    gw.on("POST", "/api/canvas/text-node/apply-edits", { json: applied });
    const r = await h.call("canvas_apply_text_edits", {
      nodeId: "t1",
      expectedContentHash: "h1",
      edits: [{ exact: "world", replacement: "x" }],
    });
    expect(r.isError).toBeFalsy();
    expect(posts("/api/canvas/text-node/apply-edits")).toHaveLength(1);
  });
});

describe("read tools", () => {
  it("get_node truncates long text and caches details for 3s; writes invalidate", async () => {
    const long = `# Title\n${"x".repeat(5000)}\n## Part`;
    gw.on("POST", "/api/canvas/nodes/detail", { json: textNode("t1", long) });
    gw.on("POST", "/api/canvas/ungroup", { json: { removed: true, removedNodeIds: ["g"], updatedNodes: [] } });
    const r = await h.call("canvas_get_node", { nodeId: "t1" });
    const node = resultJson<{ nodes: Record<string, unknown>[] }>(r).nodes[0]!;
    expect(node.textContent).toBeUndefined();
    expect((node.textPreview as string).length).toBe(600);
    expect(node.textOutline).toEqual([
      { line: 1, text: "# Title" },
      { line: 3, text: "## Part" },
    ]);
    expect(node).toMatchObject({ textTotalLines: 3, textContentHash: "h1" });
    await h.call("canvas_grep_text", { nodeId: "t1", query: "Part" });
    await h.call("canvas_read_text", { nodeId: "t1" });
    expect(posts("/api/canvas/nodes/detail")).toHaveLength(1);
    await h.call("canvas_ungroup_node", { groupId: "g" });
    await h.call("canvas_get_node", { nodeId: "t1" });
    expect(posts("/api/canvas/nodes/detail")).toHaveLength(2);
  });

  it("grep on a non-text node is an error", async () => {
    gw.on("POST", "/api/canvas/nodes/detail", { json: { nodes: [{ id: "i1", type: "image" }] } });
    const r = await h.call("canvas_grep_text", { nodeId: "i1", query: "x" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe("Error: Node is not a readable text node: i1 (type=image)");
  });

  it("list_nodes forwards type/limit/offset as query", async () => {
    gw.on("GET", "/api/canvas/nodes", { json: { count: 0, nodes: [] } });
    await h.call("canvas_list_nodes", { type: "image", limit: 5, offset: 10 });
    const q = gw.requests[0]!.query;
    expect([q.get("type"), q.get("limit"), q.get("offset")]).toEqual(["image", "5", "10"]);
  });
});

describe("grouping", () => {
  it("group_nodes always sends layout=grid and slims the response", async () => {
    gw.on("POST", "/api/canvas/group", {
      json: { groupId: "g1", addedNodes: [{ id: "g1", type: "group" }], removedNodeIds: [], updatedNodes: [{ id: "a", type: "image" }] },
    });
    const r = await h.call("canvas_group_nodes", { nodeIds: ["a", "b"], label: "L" });
    expect(posts("/api/canvas/group")[0]?.body).toEqual({ nodeIds: ["a", "b"], layout: "grid", label: "L" });
    expect(resultJson(r)).toEqual({ groupId: "g1", removedNodeIds: [], affectedNodeIds: ["a"], addedGroupId: "g1" });
  });

  it("no-op with already-grouped ids yields a merge hint", async () => {
    gw.on("POST", "/api/canvas/group", {
      json: {
        groupId: null,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        skippedNodes: [{ nodeId: "a", reason: "already-grouped", parentId: "g9" }],
      },
    });
    const r = await h.call("canvas_group_nodes", { nodeIds: ["a", "b"] });
    expect(resultJson<{ hint: string }>(r).hint).toBe(
      '1 nodeId(s) skipped: a(already-grouped, parent=g9). To merge loose nodes into an existing group, retry with MERGE mode: nodeIds=["g9", <loose-ids...>]',
    );
  });

  it("no-op spanning two groups asks the agent to pick one", async () => {
    gw.on("POST", "/api/canvas/group", {
      json: {
        groupId: null,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        skippedNodes: [
          { nodeId: "a", reason: "already-grouped", parentId: "g1" },
          { nodeId: "b", reason: "already-grouped", parentId: "g2" },
        ],
      },
    });
    const r = await h.call("canvas_group_nodes", { nodeIds: ["a", "b"] });
    expect(resultJson<{ hint: string }>(r).hint).toBe(
      '2 nodeId(s) skipped: a(already-grouped, parent=g1); b(already-grouped, parent=g2). Inputs span 2 existing groups ("g1", "g2"); cannot infer a single MERGE target. Pick ONE group to merge into and retry with MERGE mode: nodeIds=["<chosen-parent>", <loose-ids...>].',
    );
  });
});
