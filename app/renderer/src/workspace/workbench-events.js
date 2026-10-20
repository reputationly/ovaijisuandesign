/**
 * v3 工作台的编辑器/任务订阅客户端（第 161 轮从产物取回）。
 *
 * 这两个模块此前从未被还原，导致 WebSocket 少发 editor_subscribe 与
 * task_subscribe(structure-0)，模型列表与结构订阅因此永远不到。
 */

import reactExports from "react";
import { createTaskSubscriptionNegotiation } from "./workspace-structure-events.js";
import { useOptionalWSConnection } from "../settings/changelog-table.jsx";
import { assetCenterLog } from "../vendor-inline/vscode-base/graph.jsx";
function createWorkbenchEditorEvents(report) {
  const listeners2 = /* @__PURE__ */ new Set();
  let ready2 = false;
  let epoch = 0;
  const emit2 = (capabilityId) => {
    for (const listener of listeners2) listener(capabilityId);
  };
  const source = {
    subscribe(listener) {
      listeners2.add(listener);
      if (ready2) listener();
      return () => {
        listeners2.delete(listener);
      };
    }
  };
  return {
    source,
    connect(connection) {
      const ownEpoch = ++epoch;
      const subscriptionId = crypto.randomUUID();
      let disposed = false;
      let timer2;
      let serverEpoch;
      ready2 = false;
      const active2 = () => !disposed && epoch === ownEpoch;
      const subscribe2 = () => {
        if (!active2()) return;
        clearTimeout(timer2);
        timer2 = setTimeout(() => {
          report("EDITOR_SUBSCRIPTION_TIMEOUT");
          subscribe2();
        }, 1e4);
        try {
          connection.send({ type: "editor_subscribe", subscriptionId });
        } catch {
          report("EDITOR_SUBSCRIPTION_SEND_FAILED");
        }
      };
      const stop = connection.subscribe((raw2) => {
        if (!active2() || !("subscriptionId" in raw2) || raw2.subscriptionId !== subscriptionId || !raw2.type.startsWith("editor_"))
          return;
        try {
          const message2 = parseEditorServerMessage(raw2);
          if (message2.type === "editor_subscription_ready") {
            clearTimeout(timer2);
            const resync2 = !ready2 || serverEpoch !== message2.serverEpoch;
            serverEpoch = message2.serverEpoch;
            ready2 = true;
            if (resync2) emit2();
          } else if (message2.type === "editor_invalidated") {
            if (ready2 && serverEpoch === message2.serverEpoch) emit2(message2.capabilityId);
          } else {
            ready2 = false;
            clearTimeout(timer2);
            report(message2.code ?? "EDITOR_SUBSCRIPTION_CLOSED");
          }
        } catch {
          report("INVALID_EDITOR_EVENT");
        }
      });
      subscribe2();
      return () => {
        disposed = true;
        if (ownEpoch === epoch) ready2 = false;
        clearTimeout(timer2);
        stop();
        try {
          connection.send({ type: "editor_unsubscribe", subscriptionId });
        } catch {
          report("EDITOR_UNSUBSCRIBE_SEND_FAILED");
        }
      };
    }
  };
}
function useWorkbenchEditorEvents(scopeKey) {
  const connection = useOptionalWSConnection();
  const events2 = reactExports.useMemo(
    () => scopeKey ? createWorkbenchEditorEvents((code2) => {
      assetCenterLog.warn("v3_editor_events_unavailable", { code: code2 });
    }) : void 0,
    [scopeKey]
  );
  reactExports.useEffect(() => {
    if (!events2 || connection?.scope !== "workspace" || !connection.connected) return;
    return events2.connect(connection);
  }, [events2, connection]);
  return connection?.scope === "workspace" ? events2?.source : void 0;
}
const SUBSCRIPTION_TIMEOUT_MS = 1e4;
const RETRY_DELAY_MS = 5e3;
function createWorkbenchTaskEvents(scopeKey, report) {
  const listeners2 = /* @__PURE__ */ new Set();
  let ready2 = false;
  let epoch = 0;
  const resync2 = () => ({ type: "resync", scopeKey });
  const emit2 = (event) => {
    for (const listener of listeners2) listener(event);
  };
  const source = {
    subscribe(listener) {
      listeners2.add(listener);
      if (ready2) listener(resync2());
      return () => {
        listeners2.delete(listener);
      };
    }
  };
  return {
    source,
    connect(connection) {
      const currentEpoch = ++epoch;
      ready2 = false;
      const negotiation = createTaskSubscriptionNegotiation("workbench");
      let disposed = false;
      let timer2;
      const active2 = () => !disposed && currentEpoch === epoch;
      function requestSubscription() {
        if (!active2()) return;
        clearTimeout(timer2);
        timer2 = setTimeout(() => {
          if (!active2()) return;
          ready2 = false;
          report("TASK_SUBSCRIPTION_TIMEOUT");
          requestSubscription();
        }, SUBSCRIPTION_TIMEOUT_MS);
        let sent = false;
        try {
          sent = connection.send(negotiation.request());
        } catch {
          report("TASK_SUBSCRIPTION_SEND_FAILED");
        }
        if (!sent) {
          clearTimeout(timer2);
          timer2 = setTimeout(requestSubscription, RETRY_DELAY_MS);
        }
      }
      const stop = connection.subscribe((message2) => {
        if (!active2() || !("subscriptionId" in message2) || message2.subscriptionId !== negotiation.subscriptionId)
          return;
        switch (message2.type) {
          case "project_changed":
            if (!ready2 || !negotiation.projectChanges) return;
            try {
              parseTaskServerMessage(message2);
              emit2(resync2());
            } catch {
              report("PROJECT_CHANGE_INVALID");
            }
            break;
          case "task_subscription_ready": {
            try {
              const previous2 = negotiation.upgrade(message2);
              if (previous2) {
                ready2 = false;
                try {
                  connection.send({ type: "task_unsubscribe", subscriptionId: previous2 });
                } catch {
                  report("TASK_UNSUBSCRIBE_SEND_FAILED");
                }
                requestSubscription();
                return;
              }
            } catch {
              report("TASK_SUBSCRIPTION_INVALID");
              return;
            }
            clearTimeout(timer2);
            if (ready2) return;
            ready2 = true;
            emit2(resync2());
            break;
          }
          case "task_changed": {
            if (!ready2) return;
            const task2 = mapProjectTaskSnapshot(message2.task);
            if (task2) emit2({ type: "task-changed", scopeKey, task: task2 });
            else {
              report("TASK_SNAPSHOT_INVALID");
              emit2(resync2());
            }
            break;
          }
          case "task_subscription_error":
            ready2 = false;
            clearTimeout(timer2);
            report("TASK_SUBSCRIPTION_ERROR");
            if (message2.error.retryable) timer2 = setTimeout(requestSubscription, RETRY_DELAY_MS);
            break;
          case "task_subscription_closed":
            ready2 = false;
            clearTimeout(timer2);
            report("TASK_SUBSCRIPTION_CLOSED");
            break;
        }
      });
      requestSubscription();
      return () => {
        if (disposed) return;
        disposed = true;
        if (currentEpoch === epoch) ready2 = false;
        clearTimeout(timer2);
        stop();
        try {
          connection.send({ type: "task_unsubscribe", subscriptionId: negotiation.subscriptionId });
        } catch {
          report("TASK_UNSUBSCRIBE_SEND_FAILED");
        }
      };
    }
  };
}
function useWorkbenchTaskEvents(scopeKey) {
  const connection = useOptionalWSConnection();
  const events2 = reactExports.useMemo(
    () => scopeKey ? createWorkbenchTaskEvents(scopeKey, (code2) => {
      assetCenterLog.warn("v3_task_events_unavailable", { code: code2, scopeKey });
    }) : void 0,
    [scopeKey]
  );
  reactExports.useEffect(() => {
    if (!events2 || connection?.scope !== "workspace" || !connection.connected) return;
    return events2.connect(connection);
  }, [events2, connection]);
  return connection?.scope === "workspace" ? events2?.source : void 0;
}

export { useWorkbenchEditorEvents, useWorkbenchTaskEvents, createWorkbenchEditorEvents, createWorkbenchTaskEvents };
