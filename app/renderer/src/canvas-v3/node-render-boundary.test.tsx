import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NodeRenderBoundary, withNodeRenderBoundary } from "./node-render-boundary.jsx";

/**
 * 画布节点渲染隔离的回归用例。
 *
 * 边界只做两件可测的事：把错误变成 `failed` 状态、以及在该状态渲染兜底卡片。
 * 真正的"捕获"语义属于 React 本身，这里用状态 + 兜底渲染把它钉住即可。
 */
describe("画布节点渲染边界", () => {
  it("把抛出的错误转成失败状态，并记住错误摘要", () => {
    const state = NodeRenderBoundary.getDerivedStateFromError(new Error("items.length 读取失败"));
    expect(state.failed).toBe(true);
    expect(state.message).toContain("items.length");
  });

  it("失败状态渲染兜底卡片（内联样式 + 重试按钮，不依赖任何 Provider）", () => {
    const boundary = new NodeRenderBoundary({ children: null }) as unknown as NodeRenderBoundary;
    boundary.state = { failed: true, message: "selector is not a function" };
    const html = renderToStaticMarkup(boundary.render() as never);
    expect(html).toContain("该内容渲染失败");
    expect(html).toContain("selector is not a function");
    expect(html).toContain("重试");
    expect(html).toContain('role="alert"');
    expect(html).toContain("data-canvas-node-render-error");
  });

  it("未失败时原样透传子节点", () => {
    const boundary = new NodeRenderBoundary({ children: null }) as unknown as NodeRenderBoundary;
    boundary.state = { failed: false, message: "" };
    const html = renderToStaticMarkup(boundary.render() as never);
    expect(html).toBe("");
  });

  it("包装后仍保留原组件名，便于 React Flow 调试", () => {
    const Wrapped = withNodeRenderBoundary(function CanvasV3NodeView() {
      return null;
    } as never);
    expect((Wrapped as { displayName?: string }).displayName).toBe("WithNodeRenderBoundary(CanvasV3NodeView)");
  });
});
