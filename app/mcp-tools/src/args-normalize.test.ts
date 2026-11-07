import { describe, expect, it } from "vitest";

import { asArrayLike, deepUnwrapArrayWrappers, normalizeDeepArrayElements, normalizeExecuteReferences } from "./args-normalize.js";

describe("asArrayLike", () => {
  it("把被改写的数组还原", () => {
    expect(asArrayLike({ item: [{ versionId: "v1" }] })).toEqual([{ versionId: "v1" }]);
    expect(asArrayLike({ "0": { a: 1 }, "1": { a: 2 } })).toEqual([{ a: 1 }, { a: 2 }]);
    expect(asArrayLike({ versionId: "v1" })).toEqual([{ versionId: "v1" }]);
  });
});

describe("normalizeExecuteReferences", () => {
  it("单对象/字符串/JSON 字符串都收敛成 [{versionId}]", () => {
    expect(normalizeExecuteReferences({ references: { versionId: "v1" } }).references).toEqual([{ versionId: "v1" }]);
    expect(normalizeExecuteReferences({ references: '{"versionId":"v1"}' }).references).toEqual([{ versionId: "v1" }]);
  });
});

describe("normalizeDeepArrayElements", () => {
  it("数组元素被包一层 {item:…} 时解掉（真机 output.resources[0]）", () => {
    const args = { output: { resources: [{ item: { mode: "create", name: "身份锚" } }] } };
    expect(normalizeDeepArrayElements(args)).toEqual({ output: { resources: [{ mode: "create", name: "身份锚" }] } });
  });

  it("嵌套对象里的数组也会处理，正常形状保持原样（同一引用）", () => {
    const clean = { output: { resources: [{ mode: "create", name: "x" }] } };
    expect(normalizeDeepArrayElements(clean)).toBe(clean);
    const nested = { output: { composition: { placements: [{ value: { role: "主角" } }] } } };
    expect(normalizeDeepArrayElements(nested)).toEqual({ output: { composition: { placements: [{ role: "主角" }] } } });
  });

  it("不动普通字符串与标量", () => {
    expect(normalizeDeepArrayElements({ prompt: "一张图", count: 2 })).toEqual({ prompt: "一张图", count: 2 });
  });
});

describe("deepUnwrapArrayWrappers", () => {
  it("任意深度的 {item:…} 都解成数组", () => {
    const args = {
      requestId: "d1",
      sources: { item: { key: "ref", path: "a.jpg" } },
      output: { resources: { item: { mode: "create", name: "N" } }, composition: { placements: { item: { role: "R" } } } },
    };
    expect(deepUnwrapArrayWrappers(args)).toEqual({
      requestId: "d1",
      sources: [{ key: "ref", path: "a.jpg" }],
      output: { resources: [{ mode: "create", name: "N" }], composition: { placements: [{ role: "R" }] } },
    });
  });
});
