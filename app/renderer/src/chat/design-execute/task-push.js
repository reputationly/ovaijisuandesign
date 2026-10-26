/**
 * 4.0.4 的任务推送：对话区订阅 `design-chat-` 任务，收到快照后写回查询缓存。
 *
 * 为什么需要：`useDesignTask` 默认 3s 轮询；任务进入推送作用域后降到 15s，
 * `task_changed` 直接更新缓存，不必等下一次轮询。
 */
import reactExports from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useOptionalWSConnection } from "../../settings/changelog-table.jsx";
import { createTaskSubscriptionNegotiation } from "../../workspace/workspace-structure-events.js";
import { useDesignResourceScope } from "../../canvas-v3/canvas-v3-hooks.js";

export const LIVE_POLL_MS = 3_000;
export const RETRYABLE_POLL_MS = 15_000;
export const DESIGN_TASK_QUERY = "design-execute-task";
export const DESIGN_BATCH_MEMBER_QUERY = "design-cost-batch-member";
export const PUSHED_POLL_MS = 15_000;

const pushedScopesByCache = new WeakMap();
export function pushedScopes(cache) {
  let scopes = pushedScopesByCache.get(cache);
  if (!scopes) {
    scopes = new Set();
    pushedScopesByCache.set(cache, scopes);
  }
  return scopes;
}

export function designTaskFinal(task) {
  return ["completed", "failed", "cancelled"].includes(task?.status) && !designTaskRetryable(task);
}

export function designTaskRetryable(task) {
  return task?.status === "failed" && Array.isArray(task.actions) && task.actions.includes("retry");
}

export function designTaskPollInterval(cache, scopeKey, task) {
  // **还没有数据 ≠ 已经结束。** 这里原来把 `!task` 和 `designTaskFinal(task)` 一起返回
  // false，于是第一次查询失败（哪怕只是"任务还没写进列表"这种瞬时原因）之后，
  // `refetchInterval` 永远是 false —— 卡片从此只靠推送更新，一次轮询都不发，
  // 而且界面看起来正常。没有数据时继续按活跃间隔轮询，等任务落库。
  if (!task) return LIVE_POLL_MS;
  if (designTaskFinal(task)) return false;
  if (designTaskRetryable(task)) return RETRYABLE_POLL_MS;
  return pushedScopes(cache).has(scopeKey) ? PUSHED_POLL_MS : LIVE_POLL_MS;
}

/** 推送快照只在 revision 更新时覆盖，避免旧帧回退卡片。 */
export function acceptDesignTaskSnapshot(cache, scopeKey, task) {
  if (!task || typeof task.id !== "string") return;
  const followers = [
    ...cache.getQueriesData({ queryKey: [DESIGN_TASK_QUERY, scopeKey] }),
    ...cache.getQueriesData({ queryKey: [DESIGN_BATCH_MEMBER_QUERY, scopeKey, task.id] }),
  ];
  for (const [key, current] of followers) {
    if (current && typeof current.revision === "number" && current.revision >= task.revision) continue;
    cache.setQueryData(key, task);
  }
}

/** 对话区根部的订阅组件；scopeKey 与卡片共享，保证失效的是同一批查询。 */
export function useDesignTaskPush(scopeKey, ready) {
  const ws = useOptionalWSConnection();
  const cache = useQueryClient();
  const live = Boolean(ready && ws && ws.scope === "workspace" && ws.connected);
  reactExports.useEffect(() => {
    if (!live || !ws) return;
    const negotiation = createTaskSubscriptionNegotiation("design-chat");
    const scopes = pushedScopes(cache);
    let acknowledged = false;
    const stop = ws.subscribe((message) => {
      if (!("subscriptionId" in message) || message.subscriptionId !== negotiation.subscriptionId) return;
      if (message.type === "task_subscription_ready") {
        if (acknowledged) return;
        acknowledged = true;
        scopes.add(scopeKey);
        void cache.invalidateQueries({ queryKey: [DESIGN_TASK_QUERY, scopeKey] });
        void cache.invalidateQueries({ queryKey: [DESIGN_BATCH_MEMBER_QUERY, scopeKey] });
      } else if (message.type === "task_changed") {
        if (acknowledged) acceptDesignTaskSnapshot(cache, scopeKey, message.task);
      } else if (message.type === "task_subscription_error" || message.type === "task_subscription_closed") {
        acknowledged = false;
        scopes.delete(scopeKey);
      }
    });
    if (!ws.send(negotiation.request())) {
      stop();
      return;
    }
    return () => {
      stop();
      scopes.delete(scopeKey);
      try {
        ws.send({ type: "task_unsubscribe", subscriptionId: negotiation.subscriptionId });
      } catch {
        // 连接已断开时卸载不应抛错
      }
    };
  }, [cache, live, scopeKey, ws]);
}

export function DesignTaskPush() {
  const { scopeKey, ready } = useDesignResourceScope();
  useDesignTaskPush(scopeKey, ready);
  return null;
}
