import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createHarness, gatewayFor } from "./testing/harness.js";
import { registerV3Tools } from "./tools/v3-tools.js";

/**
 * v3 工具面锁死（第 316 轮）。
 *
 * 验收发现：我们的 25 个 v3 工具**只有名字对上** —— 描述 0/25 一致、参数 19/25 不同。
 * 而 v3 的 agent 配置是照参照原文复制的，它会按参照的参数名调用工具；
 * 参数名不同，agent 的工具调用就会失败，而且失败得很难查。
 *
 * 这个测试把「名字 + 描述 + 入参名」三项全部钉到参照抓包上：
 *   scripts/mcp-compare/reference-tools.json  ← 真跑参照 mcp-tools-v3 的 tools/list
 *
 * 要改 v3 工具，先改抓包、再跑 `node scripts/mcp-compare/gen-v3-schemas.mjs` 重新生成，
 * 不要手改 `v3-tool-specs.ts`（改了下次生成会被覆盖，而且这里会失败）。
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

interface ReferenceTool {
  name: string;
  description?: string;
  inputSchema?: { properties?: Record<string, unknown>; required?: string[] };
}

const reference: ReferenceTool[] = (() => {
  const raw = JSON.parse(
    readFileSync(path.join(repoRoot, "scripts/mcp-compare/reference-tools.json"), "utf8"),
  ) as { tools?: ReferenceTool[]; items?: ReferenceTool[] };
  return raw.tools ?? raw.items ?? [];
})();

function registered() {
  const h = createHarness();
  registerV3Tools(h.registrar, gatewayFor("http://127.0.0.1:1"), "domestic");
  return h;
}

const byName = new Map(reference.map((t) => [t.name, t]));

describe("v3 tool surface", () => {
  const h = registered();

  it("注册的工具名与参照完全一致", () => {
    expect([...h.registrar.collected().keys()].sort()).toEqual(
      [...byName.keys()].sort(),
    );
  });

  it("每个工具的入参名与参照完全一致", () => {
    for (const [name, collected] of h.registrar.collected()) {
      const expected = Object.keys(byName.get(name)?.inputSchema?.properties ?? {}).sort();
      expect(Object.keys(collected.inputSchema).sort(), name).toEqual(expected);
    }
  });

  it("每个工具的必填项与参照完全一致", () => {
    for (const [name, collected] of h.registrar.collected()) {
      const expected = [...(byName.get(name)?.inputSchema?.required ?? [])].sort();
      const actual = Object.entries(collected.inputSchema)
        .filter(([, schema]) => {
          const s = schema as { isOptional?: () => boolean };
          return typeof s.isOptional === "function" && !s.isOptional();
        })
        .map(([key]) => key)
        .sort();
      expect(actual, name).toEqual(expected);
    }
  });

  it("每个工具的描述与参照逐字一致", () => {
    for (const [name, collected] of h.registrar.collected()) {
      expect(collected.description, name).toBe(byName.get(name)?.description ?? "");
    }
  });
});
