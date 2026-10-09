// team-panel-loading.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Skeleton } from "./use-wallet-query.jsx";

export function isCreditTransferTarget(item, sourceGroupId) {
  if (item.lifecycle !== "ACTIVE" || item.groupId === sourceGroupId)
    return false;
  return item.accountType === "PERSONAL" || item.role === "OWNER";
}

export function TeamPanelLoading({ rows = 3 }) {
  const { t: t2 } = useTranslation();
  const rowIds = ["first", "second", "third", "fourth", "fifth"].slice(0, rows);
  return (
    <div
      role="status"
      className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-popover"
      aria-busy="true"
      data-action-ui-id="team.panel-loading"
    >
      <span className="sr-only">
        {t2("common.loading", {
          defaultValue: "加载中…",
        })}
      </span>
      {rowIds.map((rowId) => (
        <div key={rowId} className="flex min-h-16 items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3 rounded-sm" />
            <Skeleton className="h-2.5 w-2/3 rounded-sm" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
