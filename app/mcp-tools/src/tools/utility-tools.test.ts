import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { cacheKey, registerUtilityTools } from "./utility-tools.js";

let fake: FakeGateway;
let h: Harness;
let root: string;
let kDir: string;
const saved = { HILO_KNOWLEDGE_DIR: process.env.HILO_KNOWLEDGE_DIR, HILO_WORKFLOWS_DIR: process.env.HILO_WORKFLOWS_DIR };

beforeAll(async () => {
  fake = await startFakeGateway();
});
afterAll(async () => {
  await fake.close();
});

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "util-test-"));
  kDir = path.join(root, "knowledge");
  mkdirSync(path.join(kDir, "vendors"), { recursive: true });
  writeFileSync(path.join(kDir, "vendors", "seedance.md"), "alpha\nbeta\ngamma\ndelta");
  process.env.HILO_KNOWLEDGE_DIR = kDir;
  delete process.env.HILO_WORKFLOWS_DIR;
  fake.requests.length = 0;
  fake.routes.clear();
  h = createHarness();
  registerUtilityTools(h.registrar, gatewayFor(fake.url), "domestic");
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("read", () => {
  it("resolves <knowledgeDir> logical paths with offset/limit paging", async () => {
    const r = await h.call("read", { file_path: "<knowledgeDir>/vendors/seedance.md", offset: 2, limit: 2 });
    expect(r.isError).toBeFalsy();
    const text = resultText(r);
    expect(text).toContain(`<path>${path.join(kDir, "vendors", "seedance.md")}</path>`);
    expect(text).toContain("2: beta\n3: gamma");
    expect(text).toContain("(Showing lines 2-3 of 4. Use offset=4 to continue.)");
  });

  it("reads to end of file and lists directories", async () => {
    expect(resultText(await h.call("read", { file_path: path.join(kDir, "vendors", "seedance.md") }))).toContain(
      "(End of file - total 4 lines)",
    );
    const dir = resultText(await h.call("read", { file_path: "<knowledgeDir>" }));
    expect(dir).toContain("<type>directory</type>");
    expect(dir).toContain("vendors/");
  });

  it("rejects escapes from the logical root, unconfigured roots and media files", async () => {
    expect(resultText(await h.call("read", { file_path: "<knowledgeDir>/../secret.txt" }))).toBe(
      "Error: Logical resource path must stay within <knowledgeDir>.",
    );
    expect(resultText(await h.call("read", { file_path: "<workflowsDir>/x/workflow.md" }))).toContain(
      "<workflowsDir> is unavailable because HILO_WORKFLOWS_DIR is not configured.",
    );
    const media = await h.call("read", { file_path: "/tmp/photo.PNG" });
    expect(media.isError).toBe(true);
    expect(resultText(media)).toContain("is a media file. Use hub_analyse_media");
  });

  it("suggests similar names when missing and rejects binaries", async () => {
    const miss = resultText(await h.call("read", { file_path: path.join(kDir, "vendors", "seed") }));
    expect(miss).toContain("Did you mean one of these?");
    writeFileSync(path.join(root, "blob.bin"), Buffer.from([0, 1, 2]));
    expect(resultText(await h.call("read", { file_path: path.join(root, "blob.bin") }))).toContain("binary");
  });

  it("extracts .pdf text through the gateway", async () => {
    const pdf = path.join(root, "doc.pdf");
    writeFileSync(pdf, "%PDF-1.4");
    fake.on("GET", "/api/internal/document/read", { json: { ok: true, lines: ["first", "second"], offset: 1, totalLines: 5, more: true } });
    const text = resultText(await h.call("read", { file_path: pdf, limit: 2 }));
    expect(text).toContain("1: first\n2: second");
    expect(text).toContain("(Showing lines 1-2 of 5. Use offset=3 to continue.)");
    const req = fake.requests[0];
    expect(req?.query.get("path")).toBe(pdf);
    expect(req?.query.get("offset")).toBe("1");
    expect(req?.query.get("limit")).toBe("2");
  });
});

describe("analyse_media", () => {
  it("rejects non-media input and missing question", async () => {
    expect(resultText(await h.call("analyse_media", { type: "metadata", file_path: "/x/readme.md" }))).toContain(
      "hub_analyse_media only accepts media files. Non-media: /x/readme.md.",
    );
    expect(resultText(await h.call("analyse_media", { type: "semantic", file_path: "/x/a.png" }))).toContain(
      'question is required when type is "semantic" or "both".',
    );
    expect(resultText(await h.call("analyse_media", { type: "both" }))).toBe("Error: provide file_path or file_paths.");
  });

  it("metadata mode probes locally without the gateway", async () => {
    const out = resultJson<{ results: { metadata: Record<string, unknown> }[] }>(
      await h.call("analyse_media", { type: "metadata", file_path: path.join(root, "missing.mp4") }),
    );
    expect(out.results[0]?.metadata).toMatchObject({ tool: "hub_analyse_media", ok: false, error: "file not found" });
    expect(fake.requests).toHaveLength(0);
  });

  it("semantic mode uses the asset cache, otherwise analyzes and writes the cache back", async () => {
    const cached = path.join(root, "cached.png");
    const fresh = path.join(root, "fresh.jpg");
    fake.on("GET", "/api/assets", {
      json: {
        assets: [
          {
            id: "a1",
            path: cached,
            metadata: {
              read_media_cache: {
                version: "semantic-v3",
                entries: { [cacheKey("what is shown")]: { version: "semantic-v3", text: "a red fox" } },
              },
            },
          },
          { id: "a2", path: fresh, metadata: {} },
        ],
      },
    });
    fake.on("POST", "/api/edit/analyze-media", { json: { ok: true, text: "a city at night" } });
    fake.on("PATCH", "/api/assets/a2/metadata", { json: { ok: true, metadata: {} } });

    const out = resultJson<{ batch_mode: string; results: { semantic: Record<string, unknown> }[] }>(
      await h.call("analyse_media", { type: "semantic", file_paths: [cached, fresh], question: "  what is   shown " }),
    );
    expect(out.batch_mode).toBe("per_file");
    expect(out.results[0]?.semantic).toMatchObject({ source: "assets", text: "a red fox", index: 1, total: 2 });
    expect(out.results[1]?.semantic).toMatchObject({ source: "analyzed", text: "a city at night", index: 2, total: 2 });

    const analyze = fake.requests.filter((r) => r.path === "/api/edit/analyze-media");
    expect(analyze).toHaveLength(1);
    expect(analyze[0]?.body).toMatchObject({ file_path: fresh });
    const patch = fake.requests.find((r) => r.method === "PATCH");
    const entries = (patch?.body as { patch: { read_media_cache: { entries: Record<string, { text: string }> } } }).patch
      .read_media_cache.entries;
    expect(entries[cacheKey("what is shown")]?.text).toBe("a city at night");
  });

  it("force bypasses the cache; analysis failures come back per file", async () => {
    fake.on("GET", "/api/assets", { json: { assets: [] } });
    fake.on("POST", "/api/edit/analyze-media", { json: { ok: false, error: "model busy" } });
    const out = resultJson<{ results: { semantic: Record<string, unknown> }[] }>(
      await h.call("analyse_media", { type: "semantic", file_path: path.join(root, "a.webp"), question: "q", force: true }),
    );
    expect(out.results[0]?.semantic).toMatchObject({ source: "error", text: "model busy" });
  });
});
