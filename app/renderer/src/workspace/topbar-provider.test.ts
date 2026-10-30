import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `notifyTaskNeedsUserAction` 必须返回 promise。
 *
 * 真机事故（2026-10-30 15:39）：agent 在等用户回答、窗口没有焦点时，顶栏会弹"等待你的回答"
 * 通知；调用方写 `notifyTaskNeedsUserAction(...).then(...)`，而这个函数当时是
 * `void getNotificationMainService().show(...)` —— 返回 undefined，于是
 * `Cannot read properties of undefined (reading 'then')`，应用级 ErrorBoundary
 * 把整个窗口换成「出现异常」页。
 *
 * 这里钉住源码里的返回语句，防止再退化成 `void ...`。
 */
describe("顶栏通知的返回值", () => {
  const source = readFileSync(path.join(import.meta.dirname, "topbar-provider.jsx"), "utf8");
  const start = source.indexOf("function notifyTaskNeedsUserAction(");
  const end = source.indexOf("function getTaskCompletionBody(", start);
  const body = source.slice(start, end);

  it("函数体里 return 的是通知链路本身，而不是 void 掉", () => {
    expect(start).toBeGreaterThan(-1);
    expect(body).toMatch(/return getNotificationMainService\(\)/);
    expect(body).not.toMatch(/void getNotificationMainService\(\)/);
  });

  it("调用点用 Promise.resolve 兜底", () => {
    expect(source).toContain("Promise.resolve(notifyTaskNeedsUserAction(");
  });
});
