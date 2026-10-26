/**
 * `_tool_call_index`：`design_execute` 的**调用序号**。参照 4.0.4 的
 * `sidecar/opencode-plugin-hilo/dist/hilo.js` 里 `src/tool-call-order.ts`（约 392291 字节处）。
 *
 * 为什么要它：同一轮里 agent 可能连续提交多个 design_execute，而它们到达 MCP 的顺序
 * 由并发决定。带一个单调递增的序号，网关就能按"模型的本意顺序"排列与计费核对；
 * 这个值只能由插件给（模型自己写的一律清掉，见 `before` 钩子）。
 *
 * 只对 `design_execute` 递增。会话数有上限，避免长跑进程里 map 无限涨。
 */
export const TOOL_CALL_INDEX_ARG = "_tool_call_index";

const ORDERED_TOOLS = new Set(["design_execute"]);
const MAX_SESSIONS = 500;

const counters = new Map<string, number>();

export function nextToolCallIndex(sessionID: string | undefined, tool: string): number | undefined {
  if (!sessionID || !ORDERED_TOOLS.has(tool)) return undefined;
  const next = (counters.get(sessionID) ?? 0) + 1;
  // 重新插入 = 把它挪到 LRU 尾部。
  counters.delete(sessionID);
  counters.set(sessionID, next);
  while (counters.size > MAX_SESSIONS) {
    const oldest = counters.keys().next().value;
    if (oldest === undefined) break;
    counters.delete(oldest);
  }
  return next;
}

/** 测试用：清空计数（生产代码不要调）。 */
export function resetToolCallOrder(): void {
  counters.clear();
}
