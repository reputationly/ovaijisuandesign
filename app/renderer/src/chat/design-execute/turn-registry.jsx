/**
 * 4.0.3 的回合注册表：把同一回合里多个任务卡片的 task / outputs 汇总给回合级 UI。
 *
 * 卡片自己报告，注册表只在内容真的变化时通知；没有 Provider 时返回空数组，
 * 这样卡片单独渲染也不会崩。
 */
import reactExports from "react";
import { __jsx } from "../../shared/jsx-runtime.js";

const PRESENTATION_KEYS = ["model", "title", "prompt", "resolution", "aspectRatio", "duration"];
export function samePresentation(left, right) {
  return PRESENTATION_KEYS.every((key) => left[key] === right[key]);
}
export function pickPresentation(value) {
  const picked = {};
  for (const key of PRESENTATION_KEYS) if (value[key] !== undefined) picked[key] = value[key];
  return picked;
}
const outputsKey = (outputs) => outputs.map((output) => `${output.resourceId}:${output.versionId}:${output.availability ?? ""}`).join(",");

export function createDesignTaskRegistry() {
  const entries = new Map();
  const listeners = new Set();
  let reports = [];
  let tasks = [];
  let outputs = [];
  const changed = () => {
    reports = [...entries.values()];
    tasks = reports.flatMap((report) => (report.task ? [report.task] : []));
    outputs = reports.flatMap((report) => report.outputs);
    for (const listener of [...listeners]) listener();
  };
  return {
    set(entryId, value) {
      const previous = entries.get(entryId);
      if (!value) {
        if (entries.delete(entryId)) changed();
        return;
      }
      if (
        previous &&
        previous.deliveryComplete === value.deliveryComplete &&
        previous.task?.task === value.task?.task &&
        previous.task?.mediaType === value.task?.mediaType &&
        samePresentation(previous.task ?? {}, value.task ?? {}) &&
        outputsKey(previous.outputs) === outputsKey(value.outputs)
      )
        return;
      entries.set(entryId, value);
      changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getReports: () => reports,
    getTasks: () => tasks,
    getOutputs: () => outputs,
  };
}

export const DesignTaskRegistryContext = reactExports.createContext(null);
const noReports = [];
const noTasks = [];
const noOutputs = [];
const noSubscription = () => () => {};
export function DesignTaskTurnProvider({ children }) {
  const [registry] = reactExports.useState(createDesignTaskRegistry);
  return __jsx(DesignTaskRegistryContext.Provider, { value: registry, children });
}
export function useReportDesignTask(entryId, value, outputs, deliveryComplete = false) {
  const registry = reactExports.useContext(DesignTaskRegistryContext);
  const task = value?.task;
  const mediaType = value?.mediaType;
  const { model, title, prompt, resolution, aspectRatio, duration } = value ?? {};
  reactExports.useEffect(() => {
    if (!registry) return;
    registry.set(entryId, {
      deliveryComplete,
      task: task && mediaType ? { task, mediaType, ...pickPresentation({ model, title, prompt, resolution, aspectRatio, duration }) } : null,
      outputs,
    });
  }, [registry, entryId, task, mediaType, model, title, prompt, resolution, aspectRatio, duration, outputs, deliveryComplete]);
  reactExports.useEffect(() => () => registry?.set(entryId, null), [registry, entryId]);
}
export function useTurnDesignReports() {
  const registry = reactExports.useContext(DesignTaskRegistryContext);
  return reactExports.useSyncExternalStore(registry?.subscribe ?? noSubscription, registry?.getReports ?? (() => noReports), () => noReports);
}
export function useTurnDesignTasks() {
  const registry = reactExports.useContext(DesignTaskRegistryContext);
  return reactExports.useSyncExternalStore(registry?.subscribe ?? noSubscription, registry?.getTasks ?? (() => noTasks), () => noTasks);
}
export function useTurnDesignOutputs() {
  const registry = reactExports.useContext(DesignTaskRegistryContext);
  return reactExports.useSyncExternalStore(registry?.subscribe ?? noSubscription, registry?.getOutputs ?? (() => noOutputs), () => noOutputs);
}
