import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 灯箱里用到的图标必须真的被导入。
 *
 * 真机：点图片 → `ReferenceError: Minus is not defined`（补回 ImageLightboxView 时
 * 漏了 zoom 的 +/- 与翻页箭头），整个渲染树崩掉。
 */
describe("灯箱组件依赖", () => {
  const source = readFileSync(path.join(import.meta.dirname, "ui-components.js"), "utf8");

  it("ImageLightboxView 用到的图标都已导入", () => {
    const start = source.indexOf("const ImageLightboxView = reactExports.memo");
    expect(start).toBeGreaterThan(0);
    const body = source.slice(start, source.indexOf("\nconst ", start + 10));
    const used = new Set([...body.matchAll(/jsxRuntimeExports\.jsxs?\(\s*([A-Z][A-Za-z0-9_$]*)/g)].map((m) => m[1]));
    const optional = new Set(["Shell"]); // 由 props.Shell 提供，缺省 MediaLightboxView
    const header = source.slice(0, start);
    const missing = [...used].filter(
      (name) => !optional.has(name) && !new RegExp(`\\b(const|function|import)\\b[^\\n]*\\b${name.replace(/\$/g, "\\$")}\\b`).test(header),
    );
    expect(missing).toEqual([]);
  });
});
