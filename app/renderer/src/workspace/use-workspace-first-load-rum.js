/**
 * useWorkspaceFirstLoadRum（4.0.3 新增）：量一次「工作区首次加载」的分段耗时并上报。
 *
 * 移植自参照 index-B3Ss5vz1.js 的同名 hook。它记录四个里程碑：
 *   runtime_info_ms  运行时信息已拿到
 *   gateway_ready_ms 网关进入 ready 集合（gateway-ready / opencode-starting / bound）
 *   opencode_bound_ms 运行时绑定完成
 *   shell_ms         视图进入 content
 * 门限 12 秒：到点或失败/超时就上报，避免用户一直等时这条埋点永远不出现。
 *
 * `reportRumAction` 我们已有（infra/bundle-error-screen.jsx 与
 * settings/server-driven-popup-orchestrator.jsx 都在用），所以这条能落到实处。
 */

import reactExports from "react";

import { reportRumAction } from "../i18n/init-rum.js";

/** 12 秒：超过这个时间就按 timeout 上报，不再等。 */
const WORKSPACE_FIRST_LOAD_MAX_WAIT_MS = 120_000;
/** 这些状态都算「网关已经可用」。 */
const GATEWAY_READY_STATES = new Set(["gateway-ready", "opencode-starting", "bound"]);
const WORKSPACE_FIRST_LOAD_RUM_ACTION = "workspace:first_load";

export function useWorkspaceFirstLoadRum({ isActive, runtimeKnown, statusState, viewKind }) {
  const startedAtRef = reactExports.useRef(undefined);
  const warmRef = reactExports.useRef(undefined);
  const marksRef = reactExports.useRef({});
  const reportedRef = reactExports.useRef(false);
  const [deadline, expire] = reactExports.useReducer(() => true, false);

  // 开始计时只能发生一次：一旦开始过（或已上报）就不再重置，
  // 否则标签来回切换会把耗时越量越短。
  if (isActive && startedAtRef.current === undefined && !reportedRef.current) {
    startedAtRef.current = performance.now();
  }
  const started = startedAtRef.current !== undefined;

  reactExports.useEffect(() => {
    if (!started) return;
    const timer = setTimeout(expire, WORKSPACE_FIRST_LOAD_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [started]);

  reactExports.useEffect(() => {
    const startedAt = startedAtRef.current;
    if (!started || startedAt === undefined || reportedRef.current) return;
    const elapsed = Math.round(performance.now() - startedAt);
    const marks = marksRef.current;
    // 「暖启动」只记第一次看到的状态，避免后续状态覆盖它
    if (statusState && warmRef.current === undefined) warmRef.current = statusState === "bound";
    if (runtimeKnown) marks.runtimeInfo ??= elapsed;
    if (statusState && GATEWAY_READY_STATES.has(statusState)) marks.gateway ??= elapsed;
    if (statusState === "bound") marks.bound ??= elapsed;
    if (viewKind === "content") marks.shell ??= elapsed;

    const failed = viewKind === "error" || statusState === "failed";
    const timedOut = deadline || elapsed >= WORKSPACE_FIRST_LOAD_MAX_WAIT_MS;
    const done = marks.shell !== undefined && marks.bound !== undefined;
    if (!done && !failed && !timedOut) return;

    reportedRef.current = true;
    reportRumAction(WORKSPACE_FIRST_LOAD_RUM_ACTION, {
      outcome: failed ? "error" : done ? "ready" : "timeout",
      warm: warmRef.current ?? false,
      total_ms: elapsed,
      ...(marks.runtimeInfo === undefined ? {} : { runtime_info_ms: marks.runtimeInfo }),
      ...(marks.gateway === undefined ? {} : { gateway_ready_ms: marks.gateway }),
      ...(marks.bound === undefined ? {} : { opencode_bound_ms: marks.bound }),
      ...(marks.shell === undefined ? {} : { shell_ms: marks.shell }),
    });
  }, [deadline, runtimeKnown, started, statusState, viewKind]);
}
