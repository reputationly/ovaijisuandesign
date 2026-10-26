import { beforeEach, describe, expect, it } from "vitest";

import { nextToolCallIndex, resetToolCallOrder, TOOL_CALL_INDEX_ARG } from "./tool-call-order.js";

describe("design_execute 的调用序号", () => {
  beforeEach(() => resetToolCallOrder());

  it("同一个会话里单调递增（模型连着提交多次时保留本意顺序）", () => {
    expect(nextToolCallIndex("ses_a", "design_execute")).toBe(1);
    expect(nextToolCallIndex("ses_a", "design_execute")).toBe(2);
    expect(nextToolCallIndex("ses_a", "design_execute")).toBe(3);
  });

  it("会话之间各算各的", () => {
    expect(nextToolCallIndex("ses_a", "design_execute")).toBe(1);
    expect(nextToolCallIndex("ses_b", "design_execute")).toBe(1);
    expect(nextToolCallIndex("ses_a", "design_execute")).toBe(2);
  });

  it("只有 design_execute 有；别的工具和空会话都不给", () => {
    expect(nextToolCallIndex("ses_a", "design_task_query")).toBeUndefined();
    expect(nextToolCallIndex("ses_a", "hub_generate_image")).toBeUndefined();
    expect(nextToolCallIndex(undefined, "design_execute")).toBeUndefined();
  });

  it("参数名和参照一致", () => {
    expect(TOOL_CALL_INDEX_ARG).toBe("_tool_call_index");
  });
});
