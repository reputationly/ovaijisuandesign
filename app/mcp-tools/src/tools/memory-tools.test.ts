import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { parseMemoryFile, serializeMemoryFile } from "./memory-store.js";
import { registerMemoryTools } from "./memory-tools.js";

let fake: FakeGateway;
let h: Harness;
let root: string;
let projectRoot: string;
let userDir: string;
const saved = { HUB_MEMORY_DIR: process.env.HUB_MEMORY_DIR, HILO_LOAD_USER_MEMORY: process.env.HILO_LOAD_USER_MEMORY };

beforeAll(async () => {
  fake = await startFakeGateway();
  fake.on("POST", "/api/feedback-extractor/notify-manual-write", { json: { ok: true } });
});
afterAll(async () => {
  await fake.close();
});

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "mem-test-"));
  projectRoot = path.join(root, "proj");
  userDir = path.join(root, "user-memory");
  mkdirSync(projectRoot);
  process.env.HUB_MEMORY_DIR = userDir;
  delete process.env.HILO_LOAD_USER_MEMORY;
  fake.requests.length = 0;
  h = createHarness();
  registerMemoryTools(h.registrar, gatewayFor(fake.url), "domestic");
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const write = (extra: Record<string, unknown>) =>
  h.call("memory", { action: "write", type: "user", description: "d", body: "b", projectRoot, ...extra });

describe("memory", () => {
  it("writes a project entry with frontmatter and rebuilds MEMORY.md", async () => {
    const r = await write({ scope: "project", name: "image-style", type: "media-style", description: "Prefers muted film look", body: "# Style\nmuted" });
    expect(r.isError).toBeFalsy();
    const out = resultJson(r);
    expect(out).toMatchObject({ action: "write", created: true });
    const file = path.join(projectRoot, ".hilo", "memory", "media_style_image-style.md");
    expect(out.path).toBe(file);
    const parsed = parseMemoryFile(readFileSync(file, "utf8"));
    expect(parsed.frontmatter).toMatchObject({ name: "image-style", type: "media-style", source: "auto" });
    expect(parsed.frontmatter.extracted_at).toMatch(/^\d{4}-/);
    expect(parsed.body).toBe("# Style\nmuted\n");

    const index = readFileSync(path.join(projectRoot, ".hilo", "memory", "MEMORY.md"), "utf8");
    expect(index).toContain("# Memory Index");
    expect(index).toContain("- [image-style](media_style_image-style.md) — Prefers muted film look");

    const again = resultJson(await write({ scope: "project", name: "image-style", type: "media-style", description: "v2" }));
    expect(again.created).toBe(false);
  });

  it("writes user scope into HUB_MEMORY_DIR and reads it back by frontmatter name", async () => {
    await write({ scope: "user", name: "tone", description: "Casual tone", body: "keep it casual" });
    expect(existsSync(path.join(userDir, "user_tone.md"))).toBe(true);
    expect(readFileSync(path.join(userDir, "MEMORY.md"), "utf8")).toContain("- [tone](user_tone.md) — Casual tone");

    const read = resultJson(await h.call("memory", { action: "read", scope: "user", name: "tone" }));
    expect(read).toMatchObject({ action: "read", body: "keep it casual\n", frontmatter: { name: "tone", type: "user" } });
  });

  it("read of a missing entry hints to list first", async () => {
    const r = await h.call("memory", { action: "read", scope: "project", name: "nope", projectRoot });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toContain("no memory entry project/nope");
    expect(resultText(r)).toContain("action=list");
  });

  it("lists both scopes (project first) and searches description/body", async () => {
    await write({ scope: "project", name: "hero", type: "project", description: "Hero is a fox", body: "orange fur" });
    await write({ scope: "user", name: "lang", description: "Speaks Chinese", body: "zh" });
    const list = resultJson<{ entries: { scope: string; name: string }[] }>(await h.call("memory", { action: "list", projectRoot }));
    expect(list.entries.map((e) => `${e.scope}/${e.name}`)).toEqual(["project/hero", "user/lang"]);

    const search = resultJson<{ entries: { name: string; match_in: string[] }[] }>(
      await h.call("memory", { action: "search", query: "FUR", projectRoot }),
    );
    expect(search.entries).toEqual([expect.objectContaining({ name: "hero", match_in: ["body"] })]);

    const byType = resultJson<{ entries: unknown[] }>(await h.call("memory", { action: "search", query: "zh", type: "project", projectRoot }));
    expect(byType.entries).toEqual([]);
  });

  it("list without projectRoot requires scope=user", async () => {
    const r = await h.call("memory", { action: "list" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toContain("scope all needs projectRoot");
    expect((await h.call("memory", { action: "list", scope: "user" })).isError).toBeFalsy();
  });

  it("hides user scope when disabled by workspace storage.json", async () => {
    await write({ scope: "user", name: "lang", description: "Speaks Chinese", body: "zh" });
    mkdirSync(path.join(projectRoot, ".hilo"), { recursive: true });
    writeFileSync(path.join(projectRoot, ".hilo", "storage.json"), JSON.stringify({ preferences: { loadUserMemory: false } }));
    const list = resultJson<{ entries: unknown[] }>(await h.call("memory", { action: "list", projectRoot }));
    expect(list.entries).toEqual([]);
    const read = await h.call("memory", { action: "read", scope: "user", name: "lang", projectRoot });
    expect(read.isError).toBe(true);
  });

  it("deletes and updates the index", async () => {
    await write({ scope: "project", name: "a", description: "A" });
    await write({ scope: "project", name: "b", description: "B" });
    const del = resultJson(await h.call("memory", { action: "delete", scope: "project", name: "a", projectRoot }));
    expect(del).toEqual({ action: "delete", deleted: true });
    const index = readFileSync(path.join(projectRoot, ".hilo", "memory", "MEMORY.md"), "utf8");
    expect(index).not.toContain("[a]");
    expect(index).toContain("[b]");
    const again = resultJson(await h.call("memory", { action: "delete", scope: "project", name: "a", projectRoot }));
    expect(again.deleted).toBe(false);
  });

  it("validates asset-pin, scope and required write fields", async () => {
    const badScope = await write({ scope: "user", name: "pin", type: "asset-pin", asset_uri: "hilo://asset/x1", asset_modality: "image" });
    expect(resultText(badScope)).toContain("only live in project scope");
    const badUri = await write({ scope: "project", name: "pin", type: "asset-pin", asset_uri: "file:///x", asset_modality: "image" });
    expect(resultText(badUri)).toContain("is malformed; expected hilo://asset/<id>");
    const ok = await write({ scope: "project", name: "pin", type: "asset-pin", asset_uri: "hilo://asset/x1", asset_modality: "image" });
    expect(ok.isError).toBeFalsy();
    const fm = parseMemoryFile(readFileSync(path.join(projectRoot, ".hilo", "memory", "asset_pin_pin.md"), "utf8")).frontmatter;
    expect(fm).toMatchObject({ asset_uri: "hilo://asset/x1", asset_modality: "image" });
    expect(fm.source).toBeUndefined();

    expect(resultText(await h.call("memory", { action: "write", name: "x", projectRoot }))).toContain("needs scope user or project");
    expect(resultText(await h.call("memory", { action: "write", scope: "project", name: "x", projectRoot }))).toContain(
      "needs type, description and body",
    );
    expect(resultText(await write({ scope: "project", name: "x", asset_uri: "hilo://asset/1" }))).toContain("belongs to asset pins only");
  });

  it("notifies the gateway on a manual write only when a session is present", async () => {
    await write({ scope: "project", name: "n1", _session_id: "ses_1" });
    await write({ scope: "project", name: "n2" });
    await new Promise((r) => setTimeout(r, 50));
    const notes = fake.requests.filter((r) => r.path === "/api/feedback-extractor/notify-manual-write");
    expect(notes).toHaveLength(1);
    expect(notes[0]?.body).toEqual({ sessionId: "ses_1" });
    expect(notes[0]?.headers["x-session-id"]).toBe("ses_1");
  });

  it("round-trips values that need YAML quoting", () => {
    const text = serializeMemoryFile({ name: "q", description: 'a: "b", #c', type: "user" }, "");
    expect(parseMemoryFile(text).frontmatter.description).toBe('a: "b", #c');
  });
});
