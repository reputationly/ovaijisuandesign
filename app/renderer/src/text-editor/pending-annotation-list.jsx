// pending-annotation-list.jsx
import { reactExports, useTranslation, X$7 as X } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button } from "../infra/dialog-content.jsx";
import { shouldIgnoreChatGlobalShortcut } from "../media-editing/message-list-props-equal.jsx";
const MAX_VISIBLE_CARDS = 4;
export function PendingAnnotationList({
  annotations,
  activeId,
  onLocate,
  onDelete,
  onClear,
  onSend,
  submission,
  sendDisabled = false,
}) {
  const { t: t2 } = useTranslation();
  const listRef = reactExports.useRef(null);
  const submissionInFlight =
    submission?.status === "submitting" ||
    submission?.status === "accepted" ||
    submission?.status === "running";
  const submissionStatus = submissionInFlight
    ? t2("chat.pendingAnnotations.submitting", "Submitting to Agent…")
    : submission?.status === "conflict"
      ? t2(
          "chat.pendingAnnotations.conflict",
          "Document changed. Review and retry.",
        )
      : submission?.status === "failed"
        ? t2(
            "chat.pendingAnnotations.failed",
            "Agent did not apply these edits. Retry available.",
          )
        : null;
  const [maxHeight, setMaxHeight] = reactExports.useState(void 0);
  reactExports.useLayoutEffect(() => {
    const list2 = listRef.current;
    if (!list2 || annotations.length <= MAX_VISIBLE_CARDS) {
      setMaxHeight(void 0);
      return;
    }
    const cards = list2.children;
    const lastVisible = cards[MAX_VISIBLE_CARDS - 1];
    if (!lastVisible) return;
    setMaxHeight(
      lastVisible.offsetTop - list2.offsetTop + lastVisible.offsetHeight,
    );
  }, [annotations]);
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (e2) => {
    if (e2.key !== "Enter" || e2.isComposing || e2.keyCode === 229) return;
    if (e2.shiftKey || e2.metaKey || e2.ctrlKey || e2.altKey) return;
    if (shouldIgnoreChatGlobalShortcut(e2)) return;
    if (annotations.length === 0 || sendDisabled || submissionInFlight) return;
    e2.preventDefault();
    onSend();
  };
  reactExports.useEffect(() => {
    const handler = (e2) => keydownRef.current(e2);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  if (annotations.length === 0 || submissionInFlight) return null;
  return (
    <div className="mb-2 rounded-lg border border-border bg-muted/30 p-2">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span>{t2("chat.pendingAnnotations.title", "待提交批注")}</span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] text-primary">
            {annotations.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            disabled={submissionInFlight}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            data-action-ui-id="chat.pending-annotations-clear"
          >
            {t2("chat.pendingAnnotations.clear", "清空")}
          </button>
          <Button
            type="button"
            size="xs"
            onClick={onSend}
            disabled={sendDisabled || submissionInFlight}
            data-action-ui-id="chat.pending-annotations-send"
          >
            {submission?.status === "conflict" ||
            submission?.status === "failed"
              ? t2("common.retry", "Retry")
              : t2("chat.send", "发送")}
          </Button>
        </div>
      </div>
      {submissionStatus && (
        <div
          className={`mb-1.5 px-1 text-[11px] ${submission?.status === "conflict" || submission?.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
        >
          {submissionStatus}
        </div>
      )}
      <div
        ref={listRef}
        className="flex flex-col gap-1.5 overflow-y-auto"
        style={
          maxHeight !== void 0
            ? {
                maxHeight,
              }
            : void 0
        }
      >
        {annotations.map((a2) => {
          const active2 = a2.id === activeId;
          return (
            // biome-ignore lint/a11y/useSemanticElements: the card wraps a nested delete <button>, so it can't itself be a <button>
            <div
              key={a2.id}
              role="button"
              tabIndex={0}
              onClick={() => onLocate(a2.id)}
              onKeyDown={(e2) => {
                if (e2.key === "Enter" || e2.key === " ") {
                  e2.preventDefault();
                  onLocate(a2.id);
                }
              }}
              className={`group relative cursor-pointer rounded-md border px-2 py-1.5 transition-colors ${active2 ? "border-primary bg-primary/5" : "border-transparent bg-card hover:bg-muted/60"}`}
              data-annotation-card={a2.id}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                  {a2.seq}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-muted-foreground">
                    {a2.quote}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-foreground">
                    {a2.comment}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e2) => {
                    e2.stopPropagation();
                    if (!submissionInFlight) onDelete(a2.id);
                  }}
                  disabled={submissionInFlight}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                  title={t2("common.delete", "删除")}
                  aria-label={t2("common.delete", "删除")}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
