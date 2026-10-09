// chat-history-loading-state.jsx
import { Loader2 } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { Skeleton } from "../team/use-wallet-query.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./ae.jsx";

export function ChatHistoryLoadingState({
  label,
  includeChrome = false,
  className,
}) {
  return (
    <div
      className={cn$2(
        "chat-history-skeleton-stage flex min-h-0 flex-1 flex-col overflow-hidden bg-card",
        className,
      )}
      data-action-ui-id="chat.history-restoring"
      role="status"
      aria-label={label}
    >
      {includeChrome ? (
        <div className="flex h-11 shrink-0 items-center px-3">
          <Skeleton className="chat-history-skeleton-bar h-3 w-24 rounded-sm" />
        </div>
      ) : null}
      <div className="chat-history-skeleton-viewport flex min-h-0 flex-1 flex-col justify-end overflow-hidden py-6">
        <div
          className="mx-auto flex w-full flex-col gap-8 px-4"
          style={{
            maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
          }}
          data-layout-slot="chat-history-loading-content"
        >
          <div className="chat-history-loading-label flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Icon
              icon={Loader2}
              size="sm"
              className="chat-history-loading-spinner animate-spin motion-reduce:animate-none"
              aria-hidden={true}
            />
            {label}
          </div>
          <div className="chat-history-loading-node-turn flex flex-col items-end gap-2">
            <Skeleton className="chat-history-skeleton-bar h-3 w-2/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-10 w-3/5 rounded-lg" />
          </div>
          <div className="chat-history-loading-node-turn flex items-start gap-2">
            <Skeleton className="chat-history-skeleton-bar size-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <Skeleton className="chat-history-skeleton-bar h-3 w-4/5 rounded-sm" />
              <Skeleton className="chat-history-skeleton-bar h-3 w-3/5 rounded-sm" />
              <Skeleton className="chat-history-skeleton-bar h-3 w-2/5 rounded-sm" />
            </div>
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-0 flex-col items-end gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-3/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-2/5 rounded-sm" />
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-1 flex-col items-start gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-4/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-3/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-2/5 rounded-sm" />
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-2 flex-col items-end gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/2 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/3 rounded-sm" />
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-3 flex-col items-start gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-3/4 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/2 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/3 rounded-sm" />
          </div>
        </div>
      </div>
      {includeChrome ? (
        <div className="shrink-0 px-4 pb-2">
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
            }}
            data-layout-slot="chat-history-loading-composer"
          >
            <Skeleton className="chat-history-skeleton-bar h-[var(--workspace-chat-composer-default-height)] w-full rounded-[var(--message-input-surface-radius)]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
