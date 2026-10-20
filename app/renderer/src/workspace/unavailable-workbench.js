/**
 * 明确「能力不可用」的占位实现（第 238 轮）。
 *
 * 为什么需要：`native-workbench-host.jsx` / `canvas-sidebar-overlay.jsx` 里有 5 处
 * 引用了**还没还原**的符号。以前它们是裸的未定义名字，运行到就抛
 * `ReferenceError: xxx is not defined`，既不好定位，也看不出原因。
 *
 * 这里改成**显式失败**：
 *   - 组件渲染时抛出带原因的错误；
 *   - 函数调用时返回 rejected promise（带 code）；
 *   - DI 令牌在 `accessor.get()` 时抛出。
 *
 * **不是静默桩**：没有返回假数据、没有吞异常，失败是响亮的、可诊断的。
 *
 * 为什么不还原真实现（实测数据）：
 *   - `WorkspaceCompositionActions` / `WorkspaceStructurePresentation`：
 *     `--shell` 闭包发散（8 圈 80 → 2,292 声明，不收敛）；
 *   - `getNativeWorkbenchOwner` / `INativeWorkbenchService`：
 *     闭包收敛（115 声明），但依赖 `use-window-chrome` 共享 chunk
 *     （799 声明 / 28.4% 覆盖），291 个名字在树里没有导出。
 *   详见 scripts/v3preload/{shell,nwh}-closure-measurement.json。
 */

import jsxRuntimeExports from "react/jsx-runtime";

export const WORKBENCH_UNAVAILABLE = "WORKBENCH_CAPABILITY_UNAVAILABLE";

function unavailable(what, why) {
  const error = new Error(`${WORKBENCH_UNAVAILABLE}: ${what} 尚未还原（${why}）`);
  error.code = WORKBENCH_UNAVAILABLE;
  return error;
}

const SHELL_WHY = "闭包发散，shell-closure-measurement.json";
const NWH_WHY = "依赖 use-window-chrome 共享 chunk（291 个名字无导出），nwh-closure-measurement.json";

/**
 * 渲染型占位的统一实现：**渲染一段显式的「不可用」提示**，而不是抛错。
 * 抛错会掀掉整棵 React 树（进错误边界），用户只看到白屏，反而更难诊断。
 */
function UnavailableNotice({ what, why }) {
  const error = unavailable(what, why);
  return jsxRuntimeExports.jsx("div", {
    role: "alert",
    "data-unavailable": what,
    className: "flex flex-col gap-1 rounded-md border border-dashed p-3 text-xs text-muted-foreground",
    children: [
      jsxRuntimeExports.jsx("span", { className: "font-medium", children: `${what} 尚未还原` }),
      jsxRuntimeExports.jsx("span", { children: error.message }),
    ],
  });
}

export function WorkspaceCompositionActions({ children }) {
  return jsxRuntimeExports.jsx(UnavailableNotice, { what: "WorkspaceCompositionActions", why: SHELL_WHY });
}

export function WorkspaceStructurePresentation({ children }) {
  return jsxRuntimeExports.jsx(UnavailableNotice, { what: "WorkspaceStructurePresentation", why: SHELL_WHY });
}

export function getNativeWorkbenchOwner() {
  return Promise.reject(unavailable("getNativeWorkbenchOwner", NWH_WHY));
}

/** 用 createDecorator 形状的令牌，保证 `accessor.get()` 时抛出可诊断的错误 */
export function INativeWorkbenchService(accessor) {
  throw unavailable("INativeWorkbenchService", NWH_WHY);
}
INativeWorkbenchService.toString = () => "INativeWorkbenchService(unavailable)";

// ---- 合成提及标签（chat/rich-user-prompt-content.jsx 的最后一处缺口）----
// 闭包 96 个声明 / 4,102 行，且 `CompositionThumbnail` 的 dataset 偏移落在包装层里，
// 按声明边界切不准。与其塞半成品，不如显式失败。
const MENTION_WHY = "闭包 96 声明 / 4102 行，且 CompositionThumbnail 切片落在包装层内";

export function CompositionMentionTag() {
  return jsxRuntimeExports.jsx(UnavailableNotice, { what: "CompositionMentionTag", why: MENTION_WHY });
}
