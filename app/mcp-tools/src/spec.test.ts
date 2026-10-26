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

  it("spec table parses all 57 tools", () => {
    expect(spec.size).toBe(57);
  });

  it("registered names = agent whitelist minus UNSUPPORTED_TOOLS (plus the non-whitelisted extras)", () => {
    const unsupported = new Set(UNSUPPORTED_TOOLS.map((t) => t.name));
    const expected = [...agentTools.filter((t) => !unsupported.has(t)), ...NOT_WHITELISTED].sort();
    expect([...h.tools.keys()].sort()).toEqual(expected);
  });

  it("registered + UNSUPPORTED covers the whole 57-tool surface exactly once", () => {
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

  /**
   * 真正加载的 agent 配置（assets/agent-profiles/v2/config/base.json）按 agent 列 `hub_*` 工具开关。
   * 参照原文原样保留，里面有我们没注册的工具；那些必须在 UNSUPPORTED 里有说明，
   * 否则就是 agent 以为能调、实际没有的工具。通配符至少要命中一个已知工具。
   */
  it("every hub_* tool named in the shipped agent profile is registered or listed as unsupported", () => {
    const base = JSON.parse(readFileSync(path.join(repoRoot, "assets/agent-profiles/v2/config/base.json"), "utf8"));
    const unsupported = new Set(UNSUPPORTED_TOOLS.map((t) => t.name));
    const known = [...h.tools.keys(), ...unsupported];
    const named = new Set<string>();
    for (const agent of Object.values<{ tools?: Record<string, boolean> }>(base.agent ?? {})) {
      for (const key of Object.keys(agent.tools ?? {})) if (key.startsWith("hub_") && key !== "hub_*") named.add(key.slice("hub_".length));
    }
    expect(named.size).toBeGreaterThan(20);
    for (const name of named) {
      if (name.endsWith("*")) {
        const prefix = name.slice(0, -1);
        expect(known.some((k) => k.startsWith(prefix)), `hub_${name}`).toBe(true);
      } else {
        expect(h.tools.has(name) || unsupported.has(name), `hub_${name}`).toBe(true);
      }
    }
  });

  it("every tool has a non-trivial description", () => {
    for (const [name, collected] of h.registrar.collected()) {
      expect(collected.description.length, name).toBeGreaterThan(40);
    }
  });
});

// v3 架构下的工具面：设了 `HILO_PROJECT_ARCHITECTURE=resource_v3` 才有 `execute` 这 29 个。
//
// 这一条是给桌面端那条链兜底的：桌面端把架构开关转发进 MCP server 的环境，agent 才看得到
// v3 工具。真会话里 agent 说"没有 design_execute 这个工具"，一半原因是没转发、工具面整个
// 是 v2 的 —— 这里钉住"设了变量就是 v3 工具面"。
//
// ⚠️ 注意名字：**注册的是裸名**（`execute` / `task_query`），与
// `scripts/mcp-compare/reference-tools.json` 的参照 tools/list 逐字一致（`v3-spec.test.ts`
// 钉着）。而 v3 的 agent profile（`base.json` 的 media-agent）与部分工具描述里写的是
// `design_execute` 这种带前缀的名字 —— 这两层目前对不上，属于待定项，不在这条用例里改。
describe("v3 工具面", () => {
  it("设了 HILO_PROJECT_ARCHITECTURE=resource_v3 才注册 v3 的那 29 个工具", () => {
    const previous = process.env.HILO_PROJECT_ARCHITECTURE;
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    try {
      const h = createHarness();
      registerAllTools(h.registrar, gatewayFor("http://127.0.0.1:1"), "domestic");
      const names = [...h.tools.keys()];
      expect(names).toContain("execute");
      expect(names).toContain("task_query");
      // 两套工具面互斥：v3 下不该再出现 v2 的 hub_* 生成工具。
      expect(names).not.toContain("hub_generate_image");
    } finally {
      if (previous === undefined) delete process.env.HILO_PROJECT_ARCHITECTURE;
      else process.env.HILO_PROJECT_ARCHITECTURE = previous;
    }
  });

  it("不设变量时是 v2 工具面（没有 execute）", () => {
    const previous = process.env.HILO_PROJECT_ARCHITECTURE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    try {
      const h = createHarness();
      registerAllTools(h.registrar, gatewayFor("http://127.0.0.1:1"), "domestic");
      expect([...h.tools.keys()]).not.toContain("execute");
    } finally {
      if (previous !== undefined) process.env.HILO_PROJECT_ARCHITECTURE = previous;
    }
  });
});
