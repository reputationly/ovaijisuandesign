import reactExports from "react";

/**
 * 画布节点的**渲染隔离**。
 *
 * 为什么需要：v3 画布把每个 Composition 资源都渲染成一个 React Flow 节点，节点内部
 * 又挂着工具栏、媒体预览、标签面板等一大堆组件。只要其中任何一个在某个数据状态下抛错
 * （真机上已经踩到三次：`TooltipTrigger` 位置非法、`selector is not a function`、
 * `items.length` of undefined），React 会**卸载整棵画布子树** —— 用户看到的是画布空白
 * 或者只剩一屏红字，其它节点、工具栏全都没了，看起来像"整个产品坏了"。
 *
 * 有这层边界之后：崩掉的那个节点自己显示一张"内容渲染失败"的卡片（带错误摘要和重试），
 * 其它节点与画布交互照常。错误仍然 `console.error` 出去，方便排查。
 */
export class NodeRenderBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, message: "" };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { failed: true, message: error?.message ? String(error.message) : String(error ?? "") };
  }

  componentDidCatch(error, info) {
    // 保留完整堆栈给排查用；界面只显示摘要。
    console.error("[canvas] 节点渲染失败", error, info?.componentStack ?? "");
  }

  retry() {
    this.setState({ failed: false, message: "" });
  }

  render() {
    const h = reactExports.createElement;
    if (!this.state.failed) return this.props.children;
    // 刻意用内联样式：此时上下文可能正是崩掉的那一层，别依赖任何样式类或 Provider。
    const box = {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      width: "100%",
      height: "100%",
      minHeight: 120,
      padding: 12,
      boxSizing: "border-box",
      borderRadius: 12,
      border: "1px solid rgba(220,80,80,.45)",
      background: "rgba(220,80,80,.08)",
      color: "inherit",
      fontSize: 12,
      lineHeight: 1.5,
    };
    return h(
      "div",
      { role: "alert", "data-canvas-node-render-error": "true", style: box },
      h("strong", { style: { fontWeight: 600 } }, "该内容渲染失败"),
      h("span", { style: { opacity: 0.7, wordBreak: "break-word" } }, this.state.message || "未知错误"),
      h(
        "button",
        {
          type: "button",
          onClick: this.retry,
          style: {
            alignSelf: "flex-start",
            padding: "2px 10px",
            borderRadius: 999,
            border: "1px solid rgba(220,80,80,.45)",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            fontSize: 12,
          },
        },
        "重试",
      ),
    );
  }
}

/**
 * 给节点组件套上边界。返回的组件保持原组件的 `displayName`，React Flow 的节点类型
 * 映射与调试面板看到的仍是同一个名字。
 */
export function withNodeRenderBoundary(Component) {
  function CanvasNodeWithBoundary(props) {
    return reactExports.createElement(NodeRenderBoundary, null, reactExports.createElement(Component, props));
  }
  CanvasNodeWithBoundary.displayName = `WithNodeRenderBoundary(${Component.displayName || Component.name || "Node"})`;
  return CanvasNodeWithBoundary;
}
