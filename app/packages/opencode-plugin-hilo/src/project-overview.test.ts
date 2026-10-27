import { describe, expect, it } from "vitest";

import {
  compositionsFromResponse,
  fetchProjectCompositions,
  formatProjectOverview,
  NO_COMPOSITIONS,
  PROJECT_OVERVIEW_HEADER,
  withProjectOverview,
} from "./project-overview.js";

/**
 * 参照 4.0.4 实测的两个形状（从他们会话库里取的原样）：
 *
 * 空项目：
 *   <design_context>\n<project_overview>\n<header>\nThis project has no Compositions yet.\n</project_overview>\n</design_context>
 * 非空：
 *   …Types: label="演示文稿" typeId=cty_xxx count=1
 *   - name="武汉玩乐介绍 PPT" compositionId=cmp_xxx typeId=cty_xxx
 */
describe("项目概览（<project_overview>）", () => {
  it("空项目就一句 no Compositions yet", () => {
    expect(formatProjectOverview([])).toBe(["<project_overview>", PROJECT_OVERVIEW_HEADER, NO_COMPOSITIONS, "</project_overview>"].join("\n"));
  });

  it("有内容时先按类型汇总，再逐条列", () => {
    const block = formatProjectOverview([
      { compositionId: "cmp_58c844c9e36a", name: "武汉玩乐介绍 PPT", typeId: "cty_36ba8909d3e2", typeLabel: "演示文稿" },
    ]);
    expect(block).toContain('Types: label="演示文稿" typeId=cty_36ba8909d3e2 count=1');
    expect(block).toContain('- name="武汉玩乐介绍 PPT" compositionId=cmp_58c844c9e36a typeId=cty_36ba8909d3e2');
  });

  it("没有附件的消息：套一层 <design_context> 再拼正文", () => {
    const text = withProjectOverview("做一支香水广告", "<project_overview>\nx\n</project_overview>");
    expect(text.startsWith("<design_context>\n<project_overview>\nx\n</project_overview>\n</design_context>\n\n做一支香水广告")).toBe(true);
  });

  it("已有附件信封：插进去，不套第二个 <design_context>", () => {
    const existing = "<design_context>\n<user_attached_files>\n- [1] image: /w/a.png\n</user_attached_files>\n</design_context>\n\n做图";
    const text = withProjectOverview(existing, "<project_overview>\nx\n</project_overview>");
    expect(text.match(/<design_context>/g)).toHaveLength(1);
    expect(text).toContain("<project_overview>");
    expect(text).toContain("- [1] image: /w/a.png");
  });

  it("解析 list-all 响应：坏形状跳过", () => {
    const items = compositionsFromResponse({
      items: [
        { compositionId: "cmp_1", name: "A", type: { id: "cty_1", label: "视频" } },
        { compositionId: "cmp_2", name: "B" },
        { name: "缺 id" },
      ],
    });
    expect(items).toEqual([
      { compositionId: "cmp_1", name: "A", typeId: "cty_1", typeLabel: "视频" },
      { compositionId: "cmp_2", name: "B" },
    ]);
  });

  it("取清单失败时当没有（不抛）", async () => {
    const failing = (async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch;
    expect(await fetchProjectCompositions("http://127.0.0.1:1", failing)).toEqual([]);
    const throwing = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await fetchProjectCompositions("http://127.0.0.1:1", throwing)).toEqual([]);
  });
});
