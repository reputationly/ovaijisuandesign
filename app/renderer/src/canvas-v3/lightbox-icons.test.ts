import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 灯箱里用到的**组件与辅助函数**必须真的存在。
 *
 * 真机两次踩坑：
 *  - `ReferenceError: Minus is not defined`（图标没导入）；
 *  - `ReferenceError: isLightboxCopyShortcut is not defined`（辅助函数没搬过来）。
 * 都是补回 ImageLightboxView 时的遗漏，直接导致点图片/视频白屏。
 */
describe("灯箱组件依赖", () => {
  const source = readFileSync(path.join(import.meta.dirname, "ui-components.js"), "utf8");

  it("组件与辅助函数都有定义或导入", () => {
    const start = source.indexOf("const ImageLightboxView = reactExports.memo");
    expect(start).toBeGreaterThan(0);
    const body = source.slice(start, source.indexOf("\nconst ", start + 10));
    const header = source.slice(0, start);

    const components = new Set([...body.matchAll(/jsxRuntimeExports\.jsxs?\(\s*([A-Z][A-Za-z0-9_$]*)/g)].map((m) => m[1]));
    const helpers = new Set(
      [...body.matchAll(/(?<![\w.$])([a-z][A-Za-z0-9_$]*)\(/g)].map((m) => m[1]).filter((name) => /^[a-z][A-Za-z0-9_$]*$/.test(name)),
    );
    const allow = new Set([
      // 语言内建 / 局部状态
      "if", "for", "while", "switch", "catch", "return", "typeof", "function", "var",
      "setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame",
      "calc", "min", "max", "abs", "exp", "round", "pow",
      // 组件内部声明与 props
      "onCopyImage", "renderImage", "onOpenChange", "onClose", "onIndexChange", "actions",
      "setScale", "setTranslate", "setTransitioning", "setIsCompactHeader",
      "t2", "e2", "event", "next", "prev", "scale", "translate", "Shell",
      // 组件内部定义的箭头函数（const goPrev = … 等，正则只看 header 之前的行）
      "goPrev", "goNext", "applyScale", "resetZoom", "zoomBy", "onWheel",
    ]);
    // 定义可能出现在文件任意位置（组件内部也会有 const goPrev = … 这样的局部函数）。
    const defined = (name) =>
      new RegExp(`(?:const|let|var|function)\\s+${name.replace(/\$/g, "\\$")}\\b`).test(source) ||
      new RegExp(`import[^\\n]*\\b${name.replace(/\$/g, "\\$")}\\b`).test(header);
    const missing = [...components, ...helpers].filter((name) => !allow.has(name) && !defined(name));
    expect([...new Set(missing)]).toEqual([]);
  });
});
