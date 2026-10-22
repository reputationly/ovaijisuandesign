// init-rum.js
// 观测云前端监控已停用：不加载 SDK、不上报，只在本地记一份状态供诊断面板显示。
import { sanitizeRumMessage } from "../vendor-inline/vscode-base/linked-list.js";
import { isElectron } from "../infra/use-canvas-node-assets-store.js";

let initialized = false;

let rumStatus = {
  state: "idle",
  initialized: false,
  deliveryState: "idle",
  pendingEventCount: 0,
  droppedEventCount: 0,
};

export function initRum(config2) {
  if (initialized) return;
  initialized = true;
  rumStatus = {
    ...rumStatus,
    state: "disabled",
    initialized: true,
    deliveryState: "disabled",
    platform: isElectron() ? "desktop" : "web",
    version: config2.appVersion || "0.0.0",
  };
}

export function reportRumError(error) {
  rumStatus = {
    ...rumStatus,
    lastError: {
      name: error.name,
      message: sanitizeRumMessage(error.message),
      at: new Date().toISOString(),
    },
  };
}

/**
 * 记一次关键动作。**第二个参数 payload 是 4.0.3 加的**：
 * 工作区首屏耗时那条埋点要带上 outcome / total_ms / 各里程碑，
 * 原来只记 name 不够用。老调用方不传 payload 时行为不变。
 */
export function reportRumAction(name2, payload) {
  rumStatus = {
    ...rumStatus,
    lastAction: {
      name: name2,
      ...(payload === undefined ? {} : { payload }),
      at: new Date().toISOString(),
    },
  };
}

export function buildRumInitStatusTrackProps(reportReason) {
  const status = rumStatus;
  const props = {
    rum_state: status.state,
    report_reason: reportReason,
  };
  if (status.deliveryState) props.delivery_state = status.deliveryState;
  if (typeof status.pendingEventCount === "number") {
    props.pending_event_count = status.pendingEventCount;
  }
  if (typeof status.droppedEventCount === "number") {
    props.dropped_event_count = status.droppedEventCount;
  }
  if (status.platform) props.rum_platform = status.platform;
  if (status.version) props.version = status.version;
  return props;
}
