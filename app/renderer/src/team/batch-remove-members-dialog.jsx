// batch-remove-members-dialog.jsx
import { reactExports, useMutation, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
} from "./team-management-detail-loading.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import {
  creditQueryKeys,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { AlertDialog } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { teamApi } from "./team-api.js";
import { accountScopeEquals } from "./account-scope-equals.js";

async function mapPoolSettled(items, concurrency, worker) {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index2 = nextIndex;
      nextIndex += 1;
      try {
        const value = await worker(items[index2]);
        results[index2] = {
          status: "fulfilled",
          value,
        };
      } catch (reason) {
        results[index2] = {
          status: "rejected",
          reason,
        };
      }
    }
  }
  await Promise.all(
    Array.from(
      {
        length: Math.min(limit, items.length),
      },
      () => runWorker(),
    ),
  );
  return results;
}

function summarizeBatch(results) {
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const item of results) {
    if (item.status === "success") successCount += 1;
    else if (item.status === "failed") failedCount += 1;
    else skippedCount += 1;
  }
  return {
    successCount,
    failedCount,
    skippedCount,
  };
}

let ScopeChangedError$2 = class ScopeChangedError extends Error {};

const REMOVE_CONCURRENCY = 3;

export function BatchRemoveMembersDialog({
  scope,
  members,
  protectedNote,
  teamName,
  onClose,
  onComplete,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { activeScope } = useTeamAccount();
  const [error, setError] = reactExports.useState(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeScope || !accountScopeEquals(activeScope, scope)) {
        throw new ScopeChangedError$2();
      }
      const settled = await mapPoolSettled(
        members,
        REMOVE_CONCURRENCY,
        async (member) => {
          await teamApi.removeMember(scope, member.userId);
          return member;
        },
      );
      return settled.map((result, index2) => {
        const member = members[index2];
        if (result.status === "fulfilled") {
          return {
            userId: member.userId,
            displayName: member.displayName,
            status: "success",
          };
        }
        const detail = describeTeamMutationError(result.reason);
        const suffix = formatTeamMutationErrorSuffix(detail);
        return {
          userId: member.userId,
          displayName: member.displayName,
          status: "failed",
          reason: suffix || detail.code || "failed",
        };
      });
    },
    retry: false,
    onSuccess: async (results) => {
      setError(null);
      await Promise.all([
        queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.membership(scope),
        }),
        queryClient2.invalidateQueries({
          queryKey: creditQueryKeys.scope(scope),
        }),
      ]);
      const summary = summarizeBatch(results);
      const failedIds = results
        .filter((item) => item.status === "failed")
        .map((item) => item.userId);
      if (summary.failedCount === 0) {
        dedupedToast.success(
          t2("team.management.batchRemoveSucceeded", {
            defaultValue: "已移除 {{count}} 名成员。",
            count: summary.successCount,
          }),
        );
        onComplete([]);
        onClose();
        return;
      }
      const partial = t2("team.management.batchRemovePartial", {
        defaultValue: "成功 {{ok}}，失败 {{fail}}。失败成员保持选中可重试。",
        ok: summary.successCount,
        fail: summary.failedCount,
      });
      setError(partial);
      dedupedToast.error(partial);
      onComplete(failedIds);
    },
    onError: (err) => {
      if (err instanceof ScopeChangedError$2) {
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onClose();
        return;
      }
      setError(
        t2("team.management.batchRemoveFailed", {
          defaultValue: "批量移除失败，请稍后重试。",
        }),
      );
    },
  });
  return (
    <AlertDialog
      open={true}
      onOpenChange={(next2) => !next2 && !mutation.isPending && onClose()}
    >
      <AlertDialogContent
        layer="nested"
        data-action-ui-id="team.management-batch-remove-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.management.batchRemoveTitle", {
              defaultValue: "批量移除成员",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("team.management.batchRemoveDescription", {
              defaultValue:
                "确认从“{{team}}”移除 {{count}} 名成员？此操作不可撤销。",
              team: teamName,
              count: members.length,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {protectedNote ? (
          <p className="text-xs text-muted-foreground">{protectedNote}</p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={mutation.isPending}
            data-action-ui-id="team.management-batch-remove-cancel"
            onClick={() => onClose()}
          >
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={mutation.isPending}
            disabled={members.length === 0 || mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            data-action-ui-id="team.management-batch-remove-confirm"
          >
            {t2("team.management.removeSelected", {
              defaultValue: "移除成员",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
