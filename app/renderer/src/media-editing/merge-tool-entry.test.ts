import { describe, expect, it, vi } from "vitest";

// 归并函数本身要被真实执行；它牵扯到的那一圈（标签表、schema 校验、React 图标）换成最小桩，
// 只留"条目上写了什么字段"这一层 —— 这正是上一轮出问题的地方。
vi.mock("../chat/has-structured-success-payload.js", () => ({
  getToolLabelId: (name) => (name === "design_execute" ? "fileOp" : "silent"),
  categorizeToolAction: (name, args) => {
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return parsed?.capabilityId?.startsWith("generate_image") ? "imageGen" : "other";
  },
  hasSuccessfulMediaOutput: () => false,
  isToolRecoveredInterrupted: () => false,
}));
vi.mock("../chat/media-tool-result.js", () => ({
  hasMediaAnalysisFailure: () => false,
  getFileActivityKind: () => undefined,
}));
vi.mock("./unwrap-mcp-json-record.js", () => ({
  dropSupersededLegacyInFlightMediaMessages: (items) => items,
  MEDIA_GEN_CATEGORIES: new Set(),
  mediaRetryIdentityFromParts: () => undefined,
  timelineOperationTargetKey: () => undefined,
}));
vi.mock("./aggregate-timeline-runs.js", () => ({ aggregateTimelineRuns: (entries) => entries }));
vi.mock("../chat/design-tool-state.js", () => ({
  // 只要"是不是 design 工具"这件事；判定逻辑本身在 design-tool-state.test.ts 里测。
  designToolPresentation: (name) => (name === "design_execute" ? { visibility: "persistent" } : undefined),
  hasDesignToolProblem: (message) => String(JSON.parse(message.toolResult || "{}").task?.status) === "failed",
}));

const { mergeIntoTimelineEntries } = await import("./merge-into-timeline-entries.js");

const toolMessage = (overrides = {}) => ({
  id: "entry-1",
  type: "tool",
  content: "design_execute",
  callID: "call-x",
  toolArgs: JSON.stringify({ capabilityId: "generate_image:qwen-image-pro-enhanced", prompt: "红苹果" }),
  toolResult: JSON.stringify({ task: { id: "tsk_1", status: "running", revision: 1 } }),
  toolStatus: "ok",
  ...overrides,
});

describe("mergeIntoTimelineEntries：工具条目", () => {
  // 4.0.4 同时写 `callID` 与 `toolCallId`。我们原来只写后者，而卡片读 `entry.callID`
  // → 永远 undefined → `useDesignTask` 的 enabled（`taskId || callID`）为假 → 查询不打开，
  // 卡片状态全靠推送、轮询一次都不发。
  it("callID 与 toolCallId 两个字段都写", () => {
    const [entry] = mergeIntoTimelineEntries([toolMessage()]);
    expect(entry.callID).toBe("call-x");
    expect(entry.toolCallId).toBe("call-x");
  });

  it("归类用入参（第二个参数）而不是只看工具名", () => {
    const [entry] = mergeIntoTimelineEntries([toolMessage()]);
    expect(entry.category).toBe("imageGen");
  });

  it("design 工具出问题时条目状态是 error", () => {
    const [entry] = mergeIntoTimelineEntries([
      toolMessage({ toolResult: JSON.stringify({ task: { id: "tsk_1", status: "failed", revision: 2 } }) }),
    ]);
    expect(entry.toolStatus).toBe("error");
  });

  it("正常完成时沿用工具自己的状态", () => {
    const [entry] = mergeIntoTimelineEntries([toolMessage()]);
    expect(entry.toolStatus).toBe("ok");
  });
});
