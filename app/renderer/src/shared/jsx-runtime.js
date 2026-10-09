import { jsxRuntimeExports } from "../vendor.js";
// JSX 编译目标（vite.config 里 jsxFactory），转发到界面自带的 jsx / jsxs 运行时。
// 与 main.jsx 顶部的实现保持一致；main.jsx 不导出它，所以这里单独定义一份。
export function __jsx(type, props, ...children) {
  const {
    key,
    ...rest
  } = props ?? {};
  if (children.length === 1) rest.children = children[0];else if (children.length > 1) rest.children = children;
  return children.length > 1 ? jsxRuntimeExports.jsxs(type, rest, key) : jsxRuntimeExports.jsx(type, rest, key);
}
