/**
 * v3 工作台的命令提交层 —— 从产物主包整段取回（第 80 轮）。
 *
 * 产物里 `provesNoWrite` → `useResourceCommand` 是连续的一整段（118 行）：
 * 失败分类（4xx 且非 408 才算「确定没写」）→ 结果映射 → 新意图判定 →
 * `useProjectCommand`（带 mutation / 恢复态 / 持久化）→ `useResourceCommand`。
 *
 * 「整段搬」是必须的：这些函数互为前后件，单独抽哪一个都会拉到未定义的兄弟。
 */
import reactExports from "react";
import { useMutation } from "@tanstack/react-query";
import { immutableSnapshot } from "../chat/display-order.jsx";
import { useWorkbench } from "./workbench-context-access.js";

function provesNoWrite(status) {
  if (status === 408) return false;
  return status >= 400 && status < 500;
}
function statusOf(error) {
  if (!(error instanceof Error) || !("status" in error)) return void 0;
  const { status } = error;
  return typeof status === "number" ? status : void 0;
}
function classifyCommandFailure(error) {
  const status = statusOf(error);
  return status !== void 0 && provesNoWrite(status) ? "rejected" : "unknown";
}
function toCommandOutcome(receipt) {
  return receipt.committed ? { status: "committed", receipt } : { status: "conflict", receipt };
}
function toCommandFailureOutcome(error) {
  return classifyCommandFailure(error) === "rejected" ? { status: "rejected", error } : { status: "unknown", error };
}
function acceptsNewIntent(outcome) {
  return outcome?.status !== "unknown";
}
function useProjectCommand(execute) {
  const { scopeKey, persistence } = useWorkbench();
  const boundScope = reactExports.useRef({ scopeKey });
  const mutation = useMutation({
    async mutationFn(command2) {
      try {
        const receipt = await command2.execute(structuredClone(command2.envelope));
        command2.outcome = toCommandOutcome(receipt);
        return receipt;
      } catch (error) {
        command2.outcome = command2.recoveringUnknown ? { status: "unknown", error } : toCommandFailureOutcome(error);
        throw error;
      } finally {
        command2.pending = false;
        if (acceptsNewIntent(command2.outcome)) {
          command2.persistence?.dispose();
          command2.persistence = void 0;
        } else command2.persistence?.update("failed");
      }
    },
    onError(error, command2) {
      if (!command2.pending) return;
      command2.pending = false;
      command2.outcome = command2.recoveringUnknown ? { status: "unknown", error } : toCommandFailureOutcome(error);
      if (acceptsNewIntent(command2.outcome)) {
        command2.persistence?.dispose();
        command2.persistence = void 0;
      } else command2.persistence?.update("failed");
    },
    networkMode: "always",
    retry: false
  });
  if (boundScope.current.scopeKey !== scopeKey) {
    boundScope.current = { scopeKey };
    mutation.reset();
  }
  const scope = boundScope.current;
  reactExports.useSyncExternalStore(persistence.subscribe, persistence.getSnapshot, persistence.getSnapshot);
  const blockedByRecovery = !scope.command && persistence.hasPendingRecovery();
  const outcome = scope.command?.outcome;
  const awaitingReplay = !acceptsNewIntent(outcome);
  const submit = reactExports.useCallback(
    (envelope) => {
      if (boundScope.current !== scope || !scope.command && persistence.hasPendingRecovery() || mutation.isPending || scope.command?.pending || !acceptsNewIntent(scope.command?.outcome))
        return false;
      const command2 = {
        envelope: immutableSnapshot(envelope),
        execute,
        pending: true,
        recoveringUnknown: false
      };
      command2.persistence = persistence.createEntry({
        async recover() {
          if (command2.pending || command2.outcome?.status !== "unknown") return;
          command2.recoveringUnknown = true;
          command2.pending = true;
          command2.persistence?.update("saving");
          await mutation.mutateAsync(command2);
        }
      });
      scope.command = command2;
      command2.persistence?.update("saving");
      mutation.mutate(command2);
      return true;
    },
    [execute, mutation, scope, persistence]
  );
  const replay = reactExports.useCallback(() => {
    const command2 = scope.command;
    if (boundScope.current !== scope || !command2 || command2.pending || mutation.isPending) return;
    if (command2.outcome?.status === "committed" || command2.outcome?.status === "conflict") return;
    command2.execute = execute;
    command2.recoveringUnknown = command2.outcome?.status === "unknown";
    command2.pending = true;
    command2.persistence ??= persistence.createEntry();
    command2.persistence.update("saving");
    mutation.mutate(command2);
  }, [execute, mutation, scope, persistence]);
  const reset2 = reactExports.useCallback(() => {
    if (boundScope.current !== scope || mutation.isPending || scope.command?.pending || !acceptsNewIntent(scope.command?.outcome))
      return;
    scope.command = void 0;
    mutation.reset();
  }, [mutation, scope]);
  return {
    outcome,
    isPending: mutation.isPending,
    awaitingReplay,
    blockedByRecovery,
    submit,
    replay,
    reset: reset2
  };
}
function useResourceCommand() {
  const { resources } = useWorkbench();
  return useProjectCommand(
    (envelope) => resources.execute(envelope)
  );
}

export {
  provesNoWrite,
  statusOf,
  classifyCommandFailure,
  toCommandOutcome,
  toCommandFailureOutcome,
  acceptsNewIntent,
  useProjectCommand,
  useResourceCommand,
};
