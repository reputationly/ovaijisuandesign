import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createHarness, gatewayFor } from "./testing/harness.js";
import { registerAllTools, UNSUPPORTED_TOOLS } from "./tools/index.js";

/**
 * 接口面对齐：注册的工具名 = agent 白名单 − UNSUPPORTED，
 * 每个工具的入参名 = docs/mcp-tools.md 里记的入参名。
 * 名字和参数是 agent 配置直接依赖的事实，漂了就是 agent 调不通。
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const agentTools: string[] = JSON.parse(readFileSync(path.join(repoRoot, "docs/opencode-agent-tools.json"), "utf8")).tools;

/** 解析 mcp-tools.md 的表格行：| `name` | `a`, `b` |（无参数写 —）。 */
function specParams(): Map<string, string[]> {
  const md = readFileSync(path.join(repoRoot, "docs/mcp-tools.md"), "utf8");
  const out = new Map<string, string[]>();
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*`([a-z_]+)`\s*\|\s*(.*?)\s*\|\s*$/);
    if (!m?.[1]) continue;
    const params = [...(m[2] ?? "").matchAll(/`([A-Za-z_]+)`/g)].map((x) => x[1] as string);
    out.set(m[1], params.sort());
  }
  return out;
}

/**
 * 接口面里注册了、但 agent 白名单没放行的工具：子 agent 用不到，
 * 留着是给主 agent / 调试直接调（同名同参）。
 */
const NOT_WHITELISTED = ["audio_meta", "get_model_concurrency"];

function registered() {
  const h = createHarness();
  registerAllTools(h.registrar, gatewayFor("http://127.0.0.1:1"), "domestic");
  return h;
}

describe("tool surface", () => {
  const h = registered();
  const spec = specParams();

  it("spec table parses all 54 tools", () => {
    expect(spec.size).toBe(54);
  });

  it("registered names = agent whitelist minus UNSUPPORTED_TOOLS (plus the non-whitelisted extras)", () => {
    const unsupported = new Set(UNSUPPORTED_TOOLS.map((t) => t.name));
    const expected = [...agentTools.filter((t) => !unsupported.has(t)), ...NOT_WHITELISTED].sort();
    expect([...h.tools.keys()].sort()).toEqual(expected);
  });

  it("registered + UNSUPPORTED covers the whole 54-tool surface exactly once", () => {
    const all = [...h.tools.keys(), ...UNSUPPORTED_TOOLS.map((t) => t.name)].sort();
    expect(all).toEqual([...spec.keys()].sort());
  });

  it("every UNSUPPORTED entry is a known tool with a reason", () => {
    for (const t of UNSUPPORTED_TOOLS) {
      expect(spec.has(t.name), t.name).toBe(true);
      expect(t.reason.length).toBeGreaterThan(0);
    }
  });

  it("input param names match docs/mcp-tools.md", () => {
    for (const [name, collected] of h.registrar.collected()) {
      expect(Object.keys(collected.inputSchema).sort(), name).toEqual(spec.get(name));
    }
  });

  it("every tool has a non-trivial description", () => {
    for (const [name, collected] of h.registrar.collected()) {
      expect(collected.description.length, name).toBeGreaterThan(40);
    }
  });
});
