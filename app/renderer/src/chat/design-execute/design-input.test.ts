import { describe, expect, it } from "vitest";

import { designTaskCallId } from "./design-input.js";

// 卡片拿到工具调用 id 的路径：part.callID → 时间线入口的 toolCallId → 卡片。
// 这里钉住"入口上该读哪个字段"。读错的话 `useDesignTask` 的 enabled（`taskId || callID`）
// 永远为假，卡片完全靠推送更新、一次轮询都不发 —— 界面上看不出区别，只是慢。
describe("designTaskCallId", () => {
  it("时间线入口带的是 toolCallId（不是 callID）", () => {
    expect(designTaskCallId({ toolCallId: "call-1" })).toBe("call-1");
  });

  it("直接构造的入口可以只给 callID", () => {
    expect(designTaskCallId({ callID: "call-2" })).toBe("call-2");
  });

  it("两个都在时以 toolCallId 为准", () => {
    expect(designTaskCallId({ toolCallId: "right", callID: "wrong" })).toBe("right");
  });

  it("空串 / 缺字段 / 非字符串一律当没有", () => {
    expect(designTaskCallId({})).toBeUndefined();
    expect(designTaskCallId({ toolCallId: "   " })).toBeUndefined();
    expect(designTaskCallId({ toolCallId: 42 })).toBeUndefined();
    expect(designTaskCallId(undefined)).toBeUndefined();
  });
});
