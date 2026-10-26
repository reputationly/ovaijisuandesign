import { describe, expect, it } from "vitest";

// `withImageUpscale` 是 module-private，但它的两条语义可以直接按"数组上挂非枚举属性"验证：
// 1) 不给模型列表引入新元素（map/spread/序列化都不受影响）；
// 2) 只有显式 true 才算可用（gateway 没给这个字段时不能当可用）。
function attach(models: unknown[], value: unknown) {
  Object.defineProperty(models, "imageUpscaleAvailable", { value: value === true, enumerable: false, configurable: true });
  return models;
}

describe("模型列表上的图片超分标志", () => {
  it("非枚举：不影响 map / spread / JSON", () => {
    const models = attach([{ id: "a" }], true);
    expect(models.map((m) => (m as { id: string }).id)).toEqual(["a"]);
    expect({ ...models }).not.toHaveProperty("imageUpscaleAvailable");
    expect(JSON.stringify(models)).toBe('[{"id":"a"}]');
    expect((models as unknown as { imageUpscaleAvailable: boolean }).imageUpscaleAvailable).toBe(true);
  });

  it("只有显式 true 才算可用（缺字段 / 字符串 true 都不算）", () => {
    for (const value of [undefined, false, "true", 1]) {
      expect((attach([], value) as unknown as { imageUpscaleAvailable: boolean }).imageUpscaleAvailable).toBe(false);
    }
  });
});
