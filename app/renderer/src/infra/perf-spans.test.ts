import { describe, expect, it, vi } from "vitest";

import { recordPerfSpan, subscribePerfSpans } from "./perf-spans.js";

describe("perf-spans", () => {
  it("measure 并广播 span", () => {
    const spans: { name: string }[] = [];
    const off = subscribePerfSpans((span) => spans.push(span));
    recordPerfSpan("hilo:canvas-v3:test", 10, { workspaceId: "w" }, 20);
    off();
    expect(spans).toEqual([
      { name: "hilo:canvas-v3:test", startTime: 10, endTime: 20, detail: { workspaceId: "w" } },
    ]);
    expect(performance.getEntriesByName("hilo:canvas-v3:test").length).toBeGreaterThan(0);
  });

  it("监听器抛错不影响其他监听器", () => {
    const fn = vi.fn();
    const off1 = subscribePerfSpans(() => {
      throw new Error("boom");
    });
    const off2 = subscribePerfSpans(fn);
    recordPerfSpan("hilo:canvas-v3:test-2", 0, undefined, 1);
    off1();
    off2();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
