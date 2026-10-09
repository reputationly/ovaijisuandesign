// credit-ledger-table.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";
import { Skeleton } from "./use-wallet-query.jsx";

function formatTime(ms) {
  const date2 = new Date(ms);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date2.getFullYear()}-${pad(date2.getMonth() + 1)}-${pad(date2.getDate())} ${pad(date2.getHours())}:${pad(date2.getMinutes())}`;
}

export function CreditLedgerTable({
  rows,
  loading,
  error,
  descriptionLabel,
  modelLabel,
  operatorLabel,
  timeLabel,
  amountLabel,
  emptyLabel,
  errorLabel,
  retryLabel,
  onRetry,
  scrollable = true,
}) {
  const gridColumns = descriptionLabel
    ? modelLabel
      ? operatorLabel
        ? "grid-cols-[minmax(5.5rem,0.9fr)_minmax(7rem,1.1fr)_minmax(8rem,1.2fr)_minmax(7.5rem,1fr)_minmax(4.5rem,0.7fr)]"
        : "grid-cols-[minmax(7rem,1fr)_minmax(9rem,1.3fr)_minmax(8rem,1fr)_minmax(5rem,0.8fr)]"
      : "grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(5rem,0.8fr)]"
    : modelLabel && operatorLabel
      ? // 时间是定长 `YYYY-MM-DD HH:mm`，给固定 8rem 即可；省下的弹性宽度留给
        // 会被截断的“消耗人”（昵称 · 长数字 ID）。
        "grid-cols-[minmax(7rem,1fr)_minmax(10rem,2fr)_8rem_minmax(4.5rem,0.7fr)]"
      : "grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(5rem,0.8fr)]";
  return (
    <div
      className={cn$2(
        "rounded-lg border border-border",
        scrollable
          ? "flex h-[22rem] min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden"
          : "overflow-clip",
      )}
    >
      <div
        className={cn$2(
          modelLabel
            ? operatorLabel
              ? descriptionLabel
                ? "min-w-[42rem]"
                : "min-w-[36rem]"
              : "min-w-[40rem]"
            : "min-w-[28rem]",
          scrollable && "flex h-full min-h-0 flex-col",
        )}
      >
        <div
          className={cn$2(
            "grid shrink-0 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground",
            scrollable ? "bg-muted/50" : "sticky top-0 z-10 bg-muted",
            gridColumns,
          )}
        >
          {descriptionLabel ? (
            <span className="min-w-0 break-words">{descriptionLabel}</span>
          ) : null}
          {modelLabel ? (
            <span className="min-w-0 break-words">{modelLabel}</span>
          ) : null}
          {operatorLabel ? (
            <span className="min-w-0 break-words">{operatorLabel}</span>
          ) : null}
          <span className="min-w-0 break-words">{timeLabel}</span>
          <span className="min-w-0 break-words text-right">{amountLabel}</span>
        </div>
        <div className={cn$2(scrollable && "min-h-0 flex-1 overflow-y-auto")}>
          {loading ? (
            <div>
              {Array.from({
                length: 5,
              }).map((_2, index2) => (
                <div
                  key={index2}
                  className={cn$2(
                    "grid min-h-9 items-center border-b border-border/70 px-4 py-2 last:border-b-0",
                    gridColumns,
                  )}
                >
                  {descriptionLabel ? (
                    <Skeleton className="h-3 w-20 rounded-sm" />
                  ) : null}
                  {modelLabel ? (
                    <Skeleton className="h-3 w-24 rounded-sm" />
                  ) : null}
                  {operatorLabel ? (
                    <Skeleton className="h-3 w-24 rounded-sm" />
                  ) : null}
                  <Skeleton className="h-3 w-28 rounded-sm" />
                  <Skeleton className="ml-auto h-3 w-14 rounded-sm" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              className={cn$2(
                "flex flex-col items-center justify-center gap-3 px-4 text-center text-xs text-muted-foreground",
                scrollable ? "h-full min-h-40" : "min-h-24",
              )}
            >
              <span className="break-words">{errorLabel}</span>
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-7 max-w-full whitespace-normal text-center leading-relaxed"
                onClick={onRetry}
              >
                {retryLabel}
              </Button$1>
            </div>
          ) : rows.length === 0 ? (
            <div
              className={cn$2(
                "flex items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground",
                scrollable ? "h-full min-h-40" : "min-h-24",
              )}
            >
              {emptyLabel}
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={cn$2(
                  "grid items-center border-b border-border/70 px-4 py-2 last:border-b-0",
                  gridColumns,
                )}
              >
                {descriptionLabel ? (
                  <div className="min-w-0 truncate text-xs font-medium text-foreground">
                    {row.description}
                  </div>
                ) : null}
                {modelLabel ? (
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {row.model ?? "—"}
                  </div>
                ) : null}
                {operatorLabel ? (
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {row.operator ?? "—"}
                  </div>
                ) : null}
                <div className="min-w-0 truncate text-xs tabular-nums text-muted-foreground">
                  {formatTime(row.createdAtMs)}
                </div>
                <div
                  className={cn$2(
                    "min-w-0 truncate text-right text-xs font-medium tabular-nums",
                    row.tone === "credit" && "text-success",
                    row.tone === "debit" && "text-destructive",
                    row.tone === "neutral" && "text-foreground",
                  )}
                >
                  {row.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
