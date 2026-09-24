import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { parseClassifierResult, registerMetaTools } from "./meta-tools.js";

let fake: FakeGateway;
let h: Harness;
let root: string;
const saved = { HILO_KNOWLEDGE_DIR: process.env.HILO_KNOWLEDGE_DIR, HILO_WORKFLOWS_DIR: process.env.HILO_WORKFLOWS_DIR };

beforeAll(async () => {
  fake = await startFakeGateway();
});
afterAll(async () => {
  await fake.close();
});

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "meta-test-"));
  const k = path.join(root, "knowledge");
  const w = path.join(root, "workflows");
  mkdirSync(path.join(k, "vendors"), { recursive: true });
  mkdirSync(path.join(k, "failures", "_drafts"), { recursive: true });
  mkdirSync(path.join(k, "image-recipes"), { recursive: true });
  mkdirSync(path.join(w, "narrative-video"), { recursive: true });
  writeFileSync(path.join(k, "vendors", "seedance.md"), "# Seedance\nline2\nline3\nline4\nline5\nline6");
  writeFileSync(path.join(k, "failures", "character-refs.md"), "# Character refs\nintro\nrefs drift when character refs are missing\nmore refs");
  writeFileSync(path.join(k, "failures", "_drafts", "hidden.md"), "refs refs refs refs refs");
  writeFileSync(path.join(k, "image-recipes", "poster.md"), "# Poster recipe");
  writeFileSync(path.join(w, "narrative-video", "workflow.md"), "# Narrative video workflow\nrefs");
  process.env.HILO_KNOWLEDGE_DIR = k;
  process.env.HILO_WORKFLOWS_DIR = w;
  fake.requests.length = 0;
  h = createHarness();
  registerMetaTools(h.registrar, gatewayFor(fake.url), "domestic");
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const [key, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[key];
    else process.env[key] = v;
  }
});

describe("search_knowledge", () => {
  it("topic lookup returns the logical card path", async () => {
    const out = resultJson<{ results: { path: string; score: number; excerpt: string; lines_total: number }[] }>(
      await h.call("search_knowledge", { category: "vendors", topic: "seedance.md" }),
    );
    expect(out).toMatchObject({ ok: true, knowledge_dir: "<knowledgeDir>" });
    expect(out.results).toEqual([
      { path: "<knowledgeDir>/vendors/seedance.md", score: 100, excerpt: "# Seedance\nline2\nline3\nline4\nline5", lines_total: 6 },
    ]);
  });

  it("topic lookup in workflows resolves <name>/workflow.md", async () => {
    const out = resultJson<{ results: { path: string }[] }>(
      await h.call("search_knowledge", { category: "workflows", topic: "narrative-video" }),
    );
    expect(out.results[0]?.path).toBe("<workflowsDir>/narrative-video/workflow.md");
  });

  it("query ranks by term frequency, skips _ dirs, and excerpts around the first hit", async () => {
    const out = resultJson<{ results: { path: string; score: number; excerpt: string }[] }>(
      await h.call("search_knowledge", { query: "character refs" }),
    );
    expect(out.results[0]).toMatchObject({ path: "<knowledgeDir>/failures/character-refs.md" });
    expect(out.results[0]?.excerpt.split("\n")[0]).toBe("# Character refs");
    expect(out.results.map((r) => r.path)).toContain("<workflowsDir>/narrative-video/workflow.md");
    expect(out.results.some((r) => r.path.includes("_drafts"))).toBe(false);
  });

  it("requires query or topic, and reports a missing workflows root", async () => {
    const r = await h.call("search_knowledge", {});
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe("Provide keywords in `query` or a card name in `topic`.");
    process.env.HILO_WORKFLOWS_DIR = path.join(root, "missing");
    const r2 = await h.call("search_knowledge", { query: "x" });
    expect(resultText(r2)).toContain("No workflows directory is configured");
  });

  it("rejects out-of-range limit", async () => {
    await expect(h.call("search_knowledge", { query: "x", limit: 21 })).rejects.toThrow();
  });
});

describe("select_image_recipe", () => {
  it("returns the recipe when the classifier selects poster and the card exists", async () => {
    fake.on("POST", "/api/edit/generate-text-messages", { json: { ok: true, text: '```json\n{"selected":true,"recipe_id":"poster","confidence":0.9}\n```' } });
    const out = resultJson(await h.call("select_image_recipe", { user_request: "Make a launch poster" }));
    expect(out).toEqual({
      ok: true,
      selected: true,
      recipe_id: "poster",
      recipe_path: path.join(process.env.HILO_KNOWLEDGE_DIR as string, "image-recipes", "poster.md"),
      recipe_ref: "<knowledgeDir>/image-recipes/poster.md",
      confidence: 0.9,
    });
    const req = fake.requests.find((r) => r.path === "/api/edit/generate-text-messages");
    expect(req?.body).toMatchObject({ max_tokens: 128 });
    expect((req?.body as { prompt: string }).prompt).toContain("Make a launch poster");
  });

  it("skips the classifier for non-image modality and fails open on gateway errors", async () => {
    const out = resultJson(await h.call("select_image_recipe", { user_request: "x", modality: "video" }));
    expect(out.selected).toBe(false);
    expect(fake.requests).toHaveLength(0);
    fake.on("POST", "/api/edit/generate-text-messages", { status: 500, json: { message: "boom" } });
    const out2 = resultJson(await h.call("select_image_recipe", { user_request: "poster please" }));
    expect(out2).toMatchObject({ ok: true, selected: false, recipe_id: null });
  });

  it("drops unknown recipe ids", () => {
    expect(parseClassifierResult('{"selected":true,"recipe_id":"comic","confidence":0.8}')).toEqual({
      selected: false,
      recipe_id: null,
      confidence: 0,
    });
  });
});

describe("report_outcome", () => {
  it("writes one [hub-outcome] stderr line per record and never touches the gateway", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write");
    try {
      const r = await h.call("report_outcome", {
        outcomes: [
          { phase: "execute", outcome: "success", asset_id: "asset-1", vendor: "seedance", modality: "video" },
          { phase: "deliver", outcome: "partial" },
        ],
        _session_id: "ses_9",
      });
      expect(r.isError).toBeFalsy();
      expect(resultJson(r)).toMatchObject({ ok: true, count: 2 });
      const lines = spy.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith("[hub-outcome] "));
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]?.slice("[hub-outcome] ".length) ?? "{}")).toMatchObject({
        session_id: "ses_9",
        phase: "execute",
        asset_id: "asset-1",
        vendor: "seedance",
        error_class: null,
      });
      expect(stdout).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      stdout.mockRestore();
    }
    expect(fake.requests).toHaveLength(0);
  });

  it("validates per-item requirements", async () => {
    const r = await h.call("report_outcome", {
      outcomes: [{ phase: "execute", outcome: "failed" }],
    });
    expect(r.isError).toBe(true);
    expect(resultJson<{ errors: { index: number; message: string }[] }>(r).errors).toEqual([
      { index: 0, message: "outcomes[0]: failed records need an error_class." },
    ]);
  });
});
