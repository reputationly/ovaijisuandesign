import { afterEach, describe, expect, it, vi } from "vitest";

import { LogLevelController } from "./log-level.js";

describe("LogLevelController", () => {
  afterEach(() => vi.useRealTimers());

  it("设置级别并广播；非法级别拒绝", () => {
    const changed: string[] = [];
    const ctl = new LogLevelController();
    ctl.onDidChange((level) => changed.push(level));
    expect(ctl.setLevel("debug", 60)).toBe(true);
    expect(ctl.getLevel()).toBe("debug");
    expect(changed).toEqual(["debug"]);
    expect(ctl.setLevel("verbose", 60)).toBe(false);
    expect(ctl.getLevel()).toBe("debug");
  });

  it("ttl 到期恢复 info", () => {
    vi.useFakeTimers();
    const ctl = new LogLevelController();
    ctl.setLevel("warn", 1);
    expect(ctl.getLevel()).toBe("warn");
    expect(ctl.getState().override?.level).toBe("warn");
    vi.advanceTimersByTime(1001);
    expect(ctl.getLevel()).toBe("info");
    expect(ctl.getState().override).toBeNull();
  });

  it("reset 立即清除临时级别", () => {
    const ctl = new LogLevelController();
    ctl.setLevel("debug", 3600);
    ctl.reset();
    expect(ctl.getState()).toEqual({ level: "info", override: null });
  });
});
