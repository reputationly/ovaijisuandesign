import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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
  readProjectRules,
} from "./project-rules-context.js";

function project(rules?: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ov-rules-"));
  if (rules !== undefined) {
    mkdirSync(path.join(dir, ".hilo"), { recursive: true });
    writeFileSync(path.join(dir, ".hilo", "project-rules.md"), rules);
  }
  return dir;
}

describe("项目规则（v3）", () => {
  it("没有文件 = 没有规则（不是错误）", async () => {
    expect(await readProjectRules(project())).toEqual({ content: "", revision: null });
  });

  it("有文件时读出内容并算 sha256 revision（与 gateway 的口径一致）", async () => {
    const rules = await readProjectRules(project("# 规则\n- 竖向 9:16\n"));
    expect(rules.content).toBe("# 规则\n- 竖向 9:16\n");
    expect(rules.revision).toBe(projectRulesRevision(rules.content));
    expect(rules.revision).toMatch(/^[a-f0-9]{64}$/);
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
