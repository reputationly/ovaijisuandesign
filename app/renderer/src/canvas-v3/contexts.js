/**
 * v3 画布用到的 7 个 React Context —— 从产物主包逐字取回（第 76 轮）。
 *
 * 这些 Context 是 `canvas-v3-hooks.js` 里大多数 hook 的依赖层：
 * 每个 hook 基本都是「从 Context 取能力，取不到就退回本地空实现」的写法。
 * 取回的默认值也照搬（`null` / `Object.freeze({})`）。
 */
import reactExports from "react";

// ---- 画布图片任务调度 ----
export const CanvasImageWorkContext = reactExports.createContext(null);

// ---- v3 宿主能力（对话框 / 模态门 / 保存文件 / 字号偏好…）----
const NO_HOST_SERVICES = Object.freeze({});
export const CanvasV3HostServicesContext = reactExports.createContext(NO_HOST_SERVICES);
export const CanvasV3HostServicesProvider = CanvasV3HostServicesContext.Provider;
export function useCanvasV3HostServices() {
  return reactExports.useContext(CanvasV3HostServicesContext);
}

// ---- v3 工作台桥 ----
const NO_BRIDGE = Object.freeze({});
export const CanvasV3WorkbenchBridgeContext = reactExports.createContext(NO_BRIDGE);
export const CanvasV3WorkbenchBridgeProvider = CanvasV3WorkbenchBridgeContext.Provider;
export function useCanvasV3WorkbenchBridge() {
  return reactExports.useContext(CanvasV3WorkbenchBridgeContext);
}

// ---- 输入框展开状态 ----
export const ExpansionContext = reactExports.createContext(null);

// ---- 工作台 ----
export const WorkbenchContext = reactExports.createContext(null);

// ---- 结果导航 ----
export const WorkspaceResultNavigationContext = reactExports.createContext(null);
export const useWorkspaceResultNavigation = () => reactExports.useContext(WorkspaceResultNavigationContext);

// ---- 工作区结构（分组/顺序等）----
export const WorkspaceStructureContext = reactExports.createContext(null);
