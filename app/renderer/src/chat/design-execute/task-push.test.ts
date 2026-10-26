import { describe, expect, it, vi } from "vitest";

// `task-push.js` 顺带把 React 组件、i18n、sonner 整套界面依赖拖进来；这里只测**纯函数**
// 的间隔决策，把三条界面依赖换掉（它们与本用例无关）。
vi.mock("../../settings/changelog-table.jsx", () => ({ useOptionalWSConnection: () => undefined }));
vi.mock("../../workspace/workspace-structure-events.js", () => ({ createTaskSubscriptionNegotiation: () => ({ subscriptionId: "s", request: () => ({}) }) }));
vi.mock("../../canvas-v3/canvas-v3-hooks.js", () => ({ useDesignResourceScope: () => ({ scopeKey: "ws-a", ready: true }) }));

const { designTaskPollInterval, LIVE_POLL_MS } = await import("./task-push.js");

const cache = (pushed: boolean) => ({
  getQueriesData: () => [],
  has: () => pushed,
});
// 上面那个假 cache 不是真 QueryClient；pushedScopes 用的是 WeakMap，所以只能走"没推送"一路。
const notPushed = cache(false);

describe("designTaskPollInterval", () => {
  // 关键回归：第一次查询失败时 state.data 是 undefined。旧实现把它当"已结束"返回 false，
  // 卡片从此只靠推送更新、轮询一次都不发（而且是静默的，界面看不出来）。
  it("还没有任务数据时继续按活跃间隔轮询，而不是停止", () => {
    expect(designTaskPollInterval(notPushed, "ws-a", undefined)).toBe(LIVE_POLL_MS);
    expect(designTaskPollInterval(notPushed, "ws-a", null)).toBe(LIVE_POLL_MS);
  });

  it("运行中的任务按活跃间隔轮询", () => {
    expect(designTaskPollInterval(notPushed, "ws-a", { id: "t", status: "running" })).toBe(LIVE_POLL_MS);
  });

  it("终态才停", () => {
    for (const status of ["completed", "failed", "cancelled"]) {
      expect(designTaskPollInterval(notPushed, "ws-a", { id: "t", status })).toBe(false);
    }
  });
});
