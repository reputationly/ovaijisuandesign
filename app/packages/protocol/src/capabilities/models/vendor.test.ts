/**
 * 能力参数构造器与入参校验原语的测试。
 *
 * 这些是各厂商能力表共用的地基：一张表里少一个字段、`wire` 多留一个空串，
 * 表现都是「后端报 unsupported」，而错误信息里看不出是哪一层出的问题 ——
 * 所以边界（空串、空数组、上下限）都钉在这里。
 */
import { describe, expect, it } from "vitest";
import { booleanParam, durationParam, enumParam, TRUE_FALSE, upperCased } from "./vendor.js";

describe("booleanParam", () => {
  it("有描述才带 description 字段", () => {
    expect(booleanParam()).toEqual({ type: "boolean" });
    expect(booleanParam("")).toEqual({ type: "boolean" });
    expect(booleanParam("是否高清")).toEqual({ type: "boolean", description: "是否高清" });
  });
});

describe("enumParam", () => {
  it("枚举原样放进 schema", () => {
    expect(enumParam(["a", "b"], "选择")).toEqual({ type: "string", enum: ["a", "b"], description: "选择" });
    expect(enumParam([])).toEqual({ type: "string", enum: [] });
  });
});

describe("durationParam", () => {
  it("固定时长用固定措辞，并去掉「继承参考」那句", () => {
    const fixed = durationParam(5, 5);
    expect(fixed.minimum).toBe(5);
    expect(fixed.maximum).toBe(5);
    expect(fixed.description).toContain("Fixed at 5 seconds.");
    expect(fixed.description).not.toContain("Modes that inherit");
  });

  it("区间时长把取整/封顶/下限三条规则都说清楚", () => {
    const range = durationParam(4, 30);
    expect(range.description).toContain("Output duration in seconds, 4..30.");
    expect(range.description).toContain("rounded up to whole seconds and capped at 30");
    expect(range.description).toContain("below 4 is rejected");
    expect(range.description).toContain("Modes that inherit their length from a reference reject it.");
  });
});

describe("upperCased / TRUE_FALSE", () => {
  it("映射成大写", () => {
    expect(upperCased("auto", "1080p")).toEqual({ auto: "AUTO", "1080p": "1080P" });
  });

  it("字符串形式的布尔值", () => {
    expect(TRUE_FALSE).toEqual({ true: "true", false: "false" });
  });
});
