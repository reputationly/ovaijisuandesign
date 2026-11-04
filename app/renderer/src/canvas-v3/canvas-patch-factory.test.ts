import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `empty$2` 必须是**工厂函数**。
 *
 * 还原画布代码时它被退化成常量对象 `{ edges: [], nodes: [] }`，而所有调用点都写
 * `empty$2()`。后果是画布上任何"新建节点 / 连线"都在第一步抛
 * `empty$2 is not a function` —— 界面表现为：点节点右侧的「+」、选类型、什么都没发生
 * （没有节点、没有边）。真机日志里就是这一行。
 */
describe("画布 patch 工厂", () => {
  const source = readFileSync(path.join(import.meta.dirname, "canvas-area-v3.js"), "utf8");

  it("声明为函数并在调用点被调用", () => {
    expect(source).toMatch(/const empty\$2 = \(\)\s*=>\s*\(\{\s*type: "canvas\.patch",\s*nodes: \[\],\s*edges: \[\]\s*\}\)/);
    expect(source).toContain("const p2 = empty$2();");
  });

  it("不再退化成常量对象字面量", () => {
    expect(source).not.toMatch(/const empty\$2 = \{ edges: \[\], nodes: \[\] \};/);
  });
});
