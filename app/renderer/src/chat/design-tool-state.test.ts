import { describe, expect, it, vi } from "vitest";

// 这条依赖链的末端有 React 图标、i18n、preload 桥；这里只测判定逻辑本身，
// 把"呈现表 / skill 识别 / 中断文案"三处外部数据换成最小桩。
vi.mock("../chat/tools.jsx", () => ({
  TOOLS: {
    design_execute: { visibility: "persistent", label: "execute" },
    design_read: { visibility: "hidden", label: "read" },
  },
}));
vi.mock("../media-editing/connector-skill-label.js", () => ({ connectorSkillLoadName: () => undefined }));
vi.mock("../canvas/diagnostic-history-tools.js", () => ({ TOOL_ABORTED_BY_USER_TEXT: "Tool execution aborted" }));

const { designToolPresentation, hasDesignToolProblem } = await import("./design-tool-state.js");

const message = (overrides = {}) => ({ toolName: "design_execute", toolStatus: "ok", toolResult: "{}", ...overrides });

describe("hasDesignToolProblem", () => {
  it("任务失败就是问题（界面要画成 error，不能画成完成）", () => {
    expect(hasDesignToolProblem(message({ toolResult: JSON.stringify({ task: { status: "failed" } }) }))).toBe(true);
  });

  it("waiting_user / blocked / unknown 也算问题", () => {
    for (const status of ["waiting_user", "blocked", "unknown"]) {
      expect(hasDesignToolProblem(message({ toolResult: JSON.stringify({ task: { status } }) }))).toBe(true);
    }
  });

  it("结果里带 error / isError 也是问题", () => {
    expect(hasDesignToolProblem(message({ toolResult: JSON.stringify({ error: "boom" }) }))).toBe(true);
    expect(hasDesignToolProblem(message({ toolResult: JSON.stringify({ isError: true }) }))).toBe(true);
  });

  it("运行中/已完成不是问题", () => {
    expect(hasDesignToolProblem(message({ toolResult: JSON.stringify({ task: { status: "running" } }) }))).toBe(false);
    expect(hasDesignToolProblem(message({ toolResult: JSON.stringify({ task: { status: "completed" } }) }))).toBe(false);
  });

  it("用户主动中断不算问题（哪怕工具状态是 error）", () => {
    expect(hasDesignToolProblem(message({ interruption: "aborted", toolStatus: "error" }))).toBe(false);
    expect(hasDesignToolProblem(message({ toolResult: "Tool execution aborted", toolStatus: "error" }))).toBe(false);
  });
});

describe("designToolPresentation", () => {
  it("design 工具取呈现表里的条目", () => {
    expect(designToolPresentation("design_execute", {})).toMatchObject({ visibility: "persistent" });
  });

  it("不是 design 工具就是 undefined（调用方据此回落到普通工具名）", () => {
    expect(designToolPresentation("hub_generate_image", {})).toBeUndefined();
  });
});
