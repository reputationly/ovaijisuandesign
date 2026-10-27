import { describe, expect, it } from "vitest";

import {
  formatProjectRulesBlock,
  latestDeliveredProjectRules,
  needsProjectRulesDelivery,
  PROJECT_RULES_METADATA_KEY,
  PROJECT_RULES_SYSTEM_NOTE,
  projectRulesMarkerOf,
  projectRulesPart,
  projectRulesRevision,
  projectRulesFromResponse,
  fetchProjectRules,
} from "./project-rules-context.js";

describe("项目规则（v3）", () => {
  it("gateway 响应 → 规则；形状不对就当没有规则（不抛）", () => {
    expect(projectRulesFromResponse({ content: "- 9:16", revision: "abc" })).toEqual({ content: "- 9:16", revision: "abc" });
    for (const bad of [null, [], "x", { content: 1, revision: 2 }]) {
      expect(projectRulesFromResponse(bad)).toEqual({ content: "", revision: null });
    }
  });

  it("读规则走 gateway（HTTP 非 2xx 就抛，由调用方降级）", async () => {
    const seen: string[] = [];
    const ok = (async (url: string) => {
      seen.push(url);
      return { ok: true, status: 200, json: async () => ({ content: "- 竖屏", revision: "r1" }) } as unknown as Response;
    }) as unknown as typeof fetch;
    expect(await fetchProjectRules("http://127.0.0.1:1/", ok)).toEqual({ content: "- 竖屏", revision: "r1" });
    expect(seen[0]).toBe("http://127.0.0.1:1/api/project-rules");

    const bad = (async () => ({ ok: false, status: 403, json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch;
    await expect(fetchProjectRules("http://127.0.0.1:1", bad)).rejects.toThrow(/HTTP 403/);
  });

  it("块：带 revision 前缀，正文说明「这一份替换之前所有版本」；空规则也有明确说法", async () => {
    const withRules = formatProjectRulesBlock({ content: "- 用 9:16", revision: "a".repeat(64) });
    expect(withRules.startsWith('<project_rules revision="aaaaaaaaaaaa">')).toBe(true);
    expect(withRules).toContain("Current saved project rules (complete document; replaces earlier project_rules blocks):");
    expect(withRules).toContain("- 用 9:16");
    expect(withRules.trimEnd().endsWith("</project_rules>")).toBe(true);

    const empty = formatProjectRulesBlock({ content: "", revision: null });
    expect(empty.startsWith("<project_rules>")).toBe(true);
    expect(empty).toContain("No project rules are currently saved. Earlier project_rules blocks no longer apply.");
  });

  it("要不要投递：从没投过时只有真有规则才投；投过之后看 revision 变没变", () => {
    const empty = { content: "", revision: null };
    const v1 = { content: "a", revision: "1" };
    const v2 = { content: "b", revision: "2" };
    expect(needsProjectRulesDelivery("absent", empty)).toBe(false);
    expect(needsProjectRulesDelivery("absent", v1)).toBe(true);
    expect(needsProjectRulesDelivery({ revision: "1" }, v1)).toBe(false);
    expect(needsProjectRulesDelivery({ revision: "1" }, v2)).toBe(true);
    // 删光了也要让模型知道（从 "1" 变成 null）。
    expect(needsProjectRulesDelivery({ revision: "1" }, empty)).toBe(true);
  });

  it("从消息里找最近一次投递的 revision；没有就 absent", () => {
    const parts = [{ type: "text" }, { type: "text", metadata: { [PROJECT_RULES_METADATA_KEY]: { revision: "r1" } } }];
    expect(latestDeliveredProjectRules([{ parts }])).toEqual({ revision: "r1" });
    expect(latestDeliveredProjectRules([{ parts: [{ type: "text" }] }])).toBe("absent");
  });

  it("part：id 按 prt_ 格式且排在上一 part 之后、synthetic、带 revision 标记", () => {
    const previous = "prt_0000000000aa0123456789ABCDEF";
    const part = projectRulesPart({ content: "x", revision: "ff".repeat(32) }, { sessionID: "ses_1", messageID: "msg_1", previousPartId: previous });
    expect(part.id).toMatch(/^prt_[0-9a-f]{12}[0-9A-Za-z]{14}$/);
    expect((part.id as string) > previous).toBe(true);
    expect(part).toMatchObject({ sessionID: "ses_1", messageID: "msg_1", type: "text", synthetic: true });
    expect(projectRulesMarkerOf(part)).toEqual({ revision: "ff".repeat(32) });
  });

  it("system 说明逐字取自参照（避免手改漂移）", () => {
    expect(PROJECT_RULES_SYSTEM_NOTE).toContain("The project's persistent working rules arrive in <project_rules> blocks attached to user messages.");
    expect(PROJECT_RULES_SYSTEM_NOTE).toContain("A one-time exception does not change the saved rules.");
  });
});
