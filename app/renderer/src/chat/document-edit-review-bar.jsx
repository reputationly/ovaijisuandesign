// document-edit-review-bar.jsx
import {
  ChevronDown,
  ChevronUp,
  Eye,
  jsxRuntimeExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileDiff } from "../media-editing/package.jsx";
import { useDiffReviewStore } from "../text-editor/use-diff-review-store.js";
import { isDiffReviewSessionReady } from "../text-editor/is-diff-review-session-ready.js";
import { Button } from "../infra/dialog-content.jsx";
export function DocumentEditReviewBar() {
  const { t: t2 } = useTranslation();
  const session = useDiffReviewStore((state2) => state2.session);
  const reverting = useDiffReviewStore((state2) => state2.reverting);
  const historyHandler = useDiffReviewStore((state2) => state2.historyHandler);
  const activeEditorNodeId = useDiffReviewStore(
    (state2) => state2.activeEditorNodeId,
  );
  const acceptAll = useDiffReviewStore((state2) => state2.acceptAll);
  const requestUndo = useDiffReviewStore((state2) => state2.requestUndo);
  const requestOpenEditor = useDiffReviewStore(
    (state2) => state2.requestOpenEditor,
  );
  const navigation2 = useDiffReviewStore((state2) => state2.navigation);
  if (!session) return null;
  const pendingCount = session.hunks.filter(
    (hunk) => hunk.status === "pending",
  ).length;
  if (pendingCount === 0) return null;
  const inEditor = activeEditorNodeId === session.nodeId;
  const reviewBlocked =
    reverting ||
    (!isDiffReviewSessionReady(session) &&
      (inEditor || historyHandler !== null));
  const nav2 = inEditor ? navigation2 : null;
  const navBtnClass =
    "flex h-6 w-6 items-center justify-center rounded transition-colors text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs"
      data-action-ui-id="chat-diff-review-bar"
    >
      <FileDiff
        size={14}
        strokeWidth={1.5}
        className="shrink-0 text-muted-foreground"
      />
      {nav2 ? (
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <span className="truncate text-muted-foreground">
            {t2("canvas.diffReview.counter", "{{current}} / {{total}} 处修改", {
              current: nav2.current,
              total: nav2.total,
            })}
          </span>
          <button
            type="button"
            title={t2("canvas.diffReview.prev", "上一处")}
            onClick={() => nav2.step(-1)}
            className={navBtnClass}
            data-action-ui-id="chat-diff-review-prev"
          >
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            title={t2("canvas.diffReview.next", "下一处")}
            onClick={() => nav2.step(1)}
            className={navBtnClass}
            data-action-ui-id="chat-diff-review-next"
          >
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {t2("chat.diffReview.pendingCount", "{{count}} 处修改待确认", {
            count: pendingCount,
          })}
        </span>
      )}
      {inEditor ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            disabled={reviewBlocked}
            onClick={() => void requestUndo()}
            data-action-ui-id="chat-diff-review-undo-all"
          >
            {t2("chat.diffReview.undoAll", "全部撤销")}
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            disabled={reviewBlocked}
            onClick={acceptAll}
            data-action-ui-id="chat-diff-review-accept-all"
          >
            {t2("chat.diffReview.acceptAll", "全部接受")}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            disabled={reverting}
            onClick={() => void requestUndo()}
            data-action-ui-id="chat-diff-review-cancel"
          >
            {t2("chat.diffReview.cancel", "取消")}
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1 rounded-md px-2 text-xs"
            onClick={() => requestOpenEditor(session.nodeId)}
            data-action-ui-id="chat-diff-review-view"
          >
            <Eye size={14} strokeWidth={1.5} />
            {t2("chat.diffReview.view", "查看")}
          </Button>
        </>
      )}
    </div>
  );
}
