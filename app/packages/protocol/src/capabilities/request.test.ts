/**
 * 入参校验原语的测试。
 *
 * `wire` 与 `intInRange` 的边界最容易被写错，而且错了不会报错、只会静默走错分支：
 * 空串经 `Number()` 会变成合法的 0，空数组会被 JSON 成 `"[]"` 而带着「显式传值」的语义。
 */
import { describe, expect, it } from "vitest";
import { CapabilityInputError, intInRange, jsonList, reject, wire } from "./request.js";

describe("wire", () => {
  it("丢掉 undefined / null / 空串", () => {
    expect(wire({ a: 1, b: "", c: null, d: undefined })).toEqual({ a: "1" });
  });

  it("保留 false / 0 —— 它们是有效取值，不是「没填」", () => {
    expect(wire({ f: false, g: 0 })).toEqual({ f: "false", g: "0" });
  });

  it("对象值序列化成 JSON", () => {
    expect(wire({ e: { x: 1 }, arr: [1, 2] })).toEqual({ e: '{"x":1}', arr: "[1,2]" });
  });

  it("空对象进空对象出", () => {
    expect(wire({})).toEqual({});
  });
});

describe("jsonList", () => {
  it("空列表返回 undefined（后端区分「没传」和「传了空」）", () => {
    expect(jsonList([])).toBeUndefined();
    expect(jsonList([1, "a"])).toBe('[1,"a"]');
  });
});

describe("intInRange", () => {
  it("undefined 放行（由后端取默认值）", () => {
    expect(() => intInRange("s", "k", undefined, 1, 10)).not.toThrow();
  });

  it("上下限包含在内", () => {
    expect(() => intInRange("s", "k", 1, 1, 10)).not.toThrow();
    expect(() => intInRange("s", "k", 10, 1, 10)).not.toThrow();
  });

  it("越界与非整数拒绝", () => {
    expect(() => intInRange("s", "k", 0, 1, 10)).toThrow(CapabilityInputError);
    expect(() => intInRange("s", "k", 11, 1, 10)).toThrow(CapabilityInputError);
    expect(() => intInRange("s", "k", "5.5", 1, 10)).toThrow(CapabilityInputError);
  });

  it("空白串拒绝 —— 不能让它经 Number() 变成合法的 0", () => {
    expect(() => intInRange("s", "k", "  ", 1, 10)).toThrow(CapabilityInputError);
  });

  it("数字字符串按数字处理", () => {
    expect(() => intInRange("s", "k", "5", 1, 10)).not.toThrow();
  });

  it("报错文案带范围，方便对上后端日志", () => {
    expect(() => intInRange("kling", "duration", 99, 4, 30)).toThrow(/kling unsupported duration=99\. Supported values: 4\.\.30\./);
  });
});

describe("reject", () => {
  it("抛的是可识别的类型，上层能按类型归类", () => {
    expect(() => reject("boom")).toThrow(CapabilityInputError);
    try {
      reject("boom");
    } catch (e) {
      expect((e as Error).name).toBe("CapabilityInputError");
      expect((e as Error).message).toBe("boom");
    }
  });
});
