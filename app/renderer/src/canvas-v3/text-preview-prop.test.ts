import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 画布文本节点的正文必须通过 `previewText` 交给 `TextPreview`。
 *
 * 真机事故（2026-11-06）：`CanvasV3Text` 传的是 `markdown`，而 `TextPreview`
 * （ui-components 里的资产预览）**只读 `previewText`** —— 于是画布上所有文本节点
 * 正文都显示「(空文件)」，文档内容其实早就加载好了（实测 1015 字符）。
 * 这类"prop 名不匹配"编译期查不出来（都是 JS），只能靠用例兜住。
 */
describe("画布文本节点正文", () => {
  const source = readFileSync(path.join(__dirname, "canvas-area-v3.js"), "utf8");

  it("TextPreview 收到的是 previewText", () => {
    const at = source.indexOf("previewText: markdown2");
    expect(at, "CanvasV3Text 必须把正文以 previewText 传给 TextPreview").toBeGreaterThan(-1);
  });

  it("传参位置在 CanvasV3Text 组件内部", () => {
    const componentAt = source.indexOf("const CanvasV3Text = reactExports.memo");
    expect(componentAt).toBeGreaterThan(-1);
    const propAt = source.indexOf("previewText: markdown2");
    expect(propAt).toBeGreaterThan(componentAt);
    // 同一个调用里也仍带着 markdown（不冲突，便于以后换回真 markdown 渲染）
    expect(source.slice(propAt, propAt + 120)).toContain("markdown: markdown2");
  });
});
