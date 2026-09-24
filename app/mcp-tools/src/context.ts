import { AsyncLocalStorage } from "node:async_hooks";

import { AGENT_RUN_ID_ENV } from "./env.js";

/**
 * 每次工具调用的会话上下文。opencode 插件把 `_session_id` 等塞进参数，
 * registrar 取出后放进 AsyncLocalStorage，GatewayClient 据此加请求头 ——
 * 这样工具代码不用层层传 id。
 */
export type GroupScope = "legacy" | "unresolved";

export interface SessionContext {
  sessionId?: string;
  chatTurnId?: string;
  toolUseId?: string;
  groupId?: string;
  groupScope?: GroupScope;
  agentRunId?: string;
}

const storage = new AsyncLocalStorage<SessionContext>();

export function runWithSession<T>(ctx: SessionContext, fn: () => T): T {
  const agentRunId = ctx.agentRunId?.trim() || process.env[AGENT_RUN_ID_ENV]?.trim() || undefined;
  return storage.run(agentRunId ? { ...ctx, agentRunId } : { ...ctx }, fn);
}

export function currentContext(): SessionContext | undefined {
  return storage.getStore();
}
export const currentSessionId = () => storage.getStore()?.sessionId;
export const currentToolUseId = () => storage.getStore()?.toolUseId;
export const currentChatTurnId = () => storage.getStore()?.chatTurnId;
export const currentGroupId = () => storage.getStore()?.groupId;
export const currentGroupScope = () => storage.getStore()?.groupScope;
export const currentAgentRunId = () => storage.getStore()?.agentRunId;

/** 计费范围补查到结果后写回当前上下文；不在工具调用内（无 store）返回 false。 */
export function adoptBillingScope(recovered: { groupId?: string | null }): boolean {
  const store = storage.getStore();
  if (!store) return false;
  if (recovered.groupId) {
    store.groupId = recovered.groupId;
    store.groupScope = undefined;
  } else {
    store.groupId = undefined;
    store.groupScope = "legacy";
  }
  return true;
}

/** 生成提交前的闸门：没有 Group 也不是 legacy 就拒绝，宁可不提交也不记错账。 */
export function requireBillingScope(operation: string): void {
  const store = storage.getStore();
  if (store?.groupId || store?.groupScope === "legacy") return;
  throw new Error(
    `REQUEST_GROUP_UNAVAILABLE: ${operation} was not submitted because no billing Group is known for this turn ` +
      `(scope=${store?.groupScope ?? "absent"}). Try once more; a repeat means the local gateway cannot resolve ` +
      `the Group for the current turn.`,
  );
}
