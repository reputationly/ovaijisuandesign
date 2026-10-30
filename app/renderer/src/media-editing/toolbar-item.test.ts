import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `NodeToolbarInner` 必须对 `items` 兜底。
 *
 * 真机上踩过两次：`items` 为 undefined 时直接 `items.length`，React 会把**整棵画布子树**
 * 卸载（用户看到画布空白/满屏红字）。第一次修还改错了位置 —— 改到了同文件的
 * `NodeToolbarPalette` 上，真正的入口没动，于是线上又崩了一次。
 *
 * 这里直接读源码断言两件事，防止"改了但没改对地方"：
 *   1. 入口函数里有 `Array.isArray(items)` 兜底；
 *   2. 入口函数体内不再直接读 `items.length`。
 */
describe("NodeToolbarInner 的 items 兜底", () => {
  const source = readFileSync(path.join(import.meta.dirname, "toolbar-item.jsx"), "utf8");

  it("入口用 Array.isArray(items) 兜底", () => {
    expect(source).toContain("const list = Array.isArray(items) ? items : []");
  });

  it("入口函数体内不再直接读 items.length", () => {
    const start = source.indexOf("function NodeToolbarInner(");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("export const NodeToolbar", start);
    const body = source.slice(start, end);
    expect(body).not.toMatch(/items\.length/);
    expect(body).toMatch(/list\.length/);
  });
});
