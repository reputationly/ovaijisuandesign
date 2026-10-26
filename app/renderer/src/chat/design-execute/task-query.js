/**
 * 4.0.3 的任务查询：任务卡片先按 taskId 读，任务还没落 id 时按 toolUseId 反查。
 */
import reactExports from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createProjectTaskClient } from "../../canvas-v3/ui-components.js";
import { TERMINAL_TASK_STATUSES } from "../../canvas-v3/canvas-v3-model.js";
import { useGatewayFetch } from "../../assets/listeners-a.jsx";
import { DESIGN_TASK_QUERY, RETRYABLE_POLL_MS, designTaskFinal, designTaskPollInterval, designTaskRetryable } from "./task-push.js";

export async function findDesignTask(client, operation, callID, signal) {
  const page = await client.list({ operation: [operation], source: "agent", toolUseId: callID, limit: 2 }, { signal });
  if (page.items.length > 1) throw new Error("Ambiguous tool task identity");
  return page.items[0] ?? null;
}

export function useDesignTask(scopeKey, ready, operation, callID, taskId, final, executionRejected = false) {
  const fetch = useGatewayFetch();
  const cache = useQueryClient();
  const client = reactExports.useMemo(() => createProjectTaskClient(fetch), [fetch]);
  const queryKey = [DESIGN_TASK_QUERY, scopeKey, operation, callID, taskId];
  return useQuery({
    queryKey,
    enabled: (query) => Boolean(ready && operation && (taskId || callID) && (!executionRejected || taskId || query.state.data?.id)),
    queryFn: async ({ signal }) => {
      if (!operation || (!taskId && !callID)) return null;
      const knownId = taskId ?? undefined;
      if (executionRejected && !knownId) return null;
      const task = knownId ? (await client.get(knownId, { signal })).task : await findDesignTask(client, operation, callID ?? "", signal);
      if (task && (task.operation !== operation || (callID && task.origin?.toolUseId !== callID))) throw new Error("Task identity mismatch");
      return task;
    },
    refetchInterval: (query) => (final || designTaskFinal(query.state.data) || !ready || (executionRejected && !taskId && !query.state.data?.id) ? false : designTaskRetryable(query.state.data) ? RETRYABLE_POLL_MS : designTaskPollInterval(cache, scopeKey, query.state.data)),

    structuralSharing: (previous, next) => (previous && (!next || (previous.id === next.id && previous.revision > next.revision)) ? previous : next),
    retry: false,
  });
}

export function useDesignTaskParams(scopeKey, ready, taskId) {
  const fetch = useGatewayFetch();
  const client = reactExports.useMemo(() => createProjectTaskClient(fetch), [fetch]);
  return useQuery({
    queryKey: ["design-execute-task-params", scopeKey, taskId],
    enabled: Boolean(ready && taskId),
    queryFn: async ({ signal }) => (taskId ? (await client.get(taskId, { signal })).input?.params ?? null : null),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}
