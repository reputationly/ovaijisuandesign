/**
 * 4.0.4：对话区订阅任务推送（`design-chat-` 前缀）。
 *
 * 参照的 `useDesignTaskPush` 还会把快照写进任务查询缓存；源码树目前没有
 * `design-execute-task` 卡片缓存，所以这里只做订阅握手/关闭，保证 WS 行为与
 * 参照一致（`task_subscribe` / `task_unsubscribe`），不伪造任务卡片。
 */
import reactExports from "react";

import { createTaskSubscriptionNegotiation } from "../workspace/workspace-structure-events.js";
import { useOptionalWSConnection } from "../settings/changelog-table.jsx";
import { AuthContext, accountScopeKey, useGatewayScope, useOptionalTeamAccount } from "../canvas-v3/main-exports.js";

function useDesignResourceScope() {
  const scope = useGatewayScope();
  const auth = reactExports.useContext(AuthContext);
  const account = useOptionalTeamAccount();
  const billingScope = accountScopeKey(account?.activeScope ?? null);
  const scopeKey = JSON.stringify([
    scope.scopeKey,
    scope.gatewayBinding?.instanceId,
    scope.gatewayBinding?.generation,
    auth?.user?.userID,
    billingScope,
  ]);
  const ready = Boolean(
    scope.gatewayReady &&
      scope.scopeKey !== "app" &&
      auth?.user?.userID &&
      (!account?.integrationEnabled || (account.accountDataVisible && billingScope !== null)),
  );
  return { scopeKey, ready };
}

export function useDesignTaskPush(scopeKey, ready) {
  const ws = useOptionalWSConnection();
  const live = Boolean(ready && ws && ws.scope === "workspace" && ws.connected);
  reactExports.useEffect(() => {
    if (!live || !ws) return;
    const negotiation = createTaskSubscriptionNegotiation("design-chat");
    let acknowledged = false;
    const stop = ws.subscribe((message) => {
      if (!("subscriptionId" in message) || message.subscriptionId !== negotiation.subscriptionId) return;
      if (message.type === "task_subscription_ready") {
        acknowledged = true;
      } else if (message.type === "task_subscription_error" || message.type === "task_subscription_closed") {
        acknowledged = false;
      }
    });
    if (!ws.send(negotiation.request())) {
      stop();
      return;
    }
    return () => {
      stop();
      try {
        ws.send({ type: "task_unsubscribe", subscriptionId: negotiation.subscriptionId });
      } catch {
        // 连接已断开时卸载不应抛错
      }
    };
  }, [live, scopeKey, ws]);
}

export function DesignTaskPush() {
  const { scopeKey, ready } = useDesignResourceScope();
  useDesignTaskPush(scopeKey, ready);
  return null;
}
